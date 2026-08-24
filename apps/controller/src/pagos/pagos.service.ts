import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { PagoResponseDto, RegistrarPagoDto } from './dto/pagos.dto.js';
import type {
  PagoRechazadoDto,
  PagosRechazadosQueryDto,
} from './dto/pagos-rechazados.dto.js';
import type { IncorporarAbonoExternoDto } from './dto/abonos-externos.dto.js';

const ACCION_DUPLICADO_RECHAZADO = 'PAGO_INCIDENCIA_DUPLICADO_RECHAZADO';

type IncidenciaTipo =
  | 'CUENTA_NO_DETERMINADA'
  | 'ERROR_PERSISTENCIA'
  | 'HISTORIAL_NO_CONSULTABLE'
  | 'DUPLICADO_RECHAZADO'
  | 'ABONO_CLIENTE_NO_IDENTIFICADO'
  | 'ABONO_ERROR_ACTUALIZAR_SALDO';

type DatosPago = {
  monto: number;
  fecha_pago: string;
  codigo_transaccion: string;
  pasarela: string;
  token_transaccional?: string;
};

@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * CU-44: registra un pago confirmado por la entidad recaudadora
   * (recaudación externa vía CU-46 en este incremento; pasarela vía CU-42/43
   * más adelante — ambas entran por la misma interfaz de dominio, ver
   * `aplicarPago`).
   *
   * Nota de alcance: la Excepción 1 de CU-44/CU-45 (datos incompletos o
   * código de transacción ausente/corrupto) ya la resuelve
   * `ZodValidationPipe` en el controller — un 400 antes de llegar aquí. No se
   * registra incidencia para ese caso porque el payload nunca llega a
   * asociarse a nada (no hay `entidad_afectada` real que loguear).
   */
  async registrarPagoConfirmado(
    dto: RegistrarPagoDto,
    ip: string,
  ): Promise<PagoResponseDto> {
    await this.asegurarSinDuplicado(dto.codigo_transaccion, ip, dto);

    // CU-44 Excepción 2: resolver la cuenta/contrato asociado a la factura
    const factura = await this.prisma.factura.findUnique({
      where: { id_factura: dto.id_factura },
      select: { id_factura: true, contrato: { select: { id_cliente: true } } },
    });

    if (!factura || !factura.contrato?.id_cliente) {
      await this.registrarIncidencia('CUENTA_NO_DETERMINADA', dto, ip);
      throw new UnprocessableEntityException(
        'No fue posible asociar el pago a una cuenta o contrato válido',
      );
    }

    return this.aplicarPago(
      { id_factura: factura.id_factura },
      factura.contrato.id_cliente,
      dto,
      ip,
      'ERROR_PERSISTENCIA',
    );
  }

  /**
   * CU-46: incorpora al saldo del cliente un abono reportado por una entidad
   * de recaudación externa (pago hecho fuera de nuestro sistema, ej. en caja
   * física). Identifica el contrato por `codigo_abonado` (= `id_contrato`,
   * mismo patrón que `deuda-publica.service.ts#consultarPorAbonado`) — no
   * por RUT, para no tener que resolver la ambigüedad de un cliente con
   * varios contratos.
   *
   * Reusa `aplicarPago()`, el mismo núcleo que CU-44 — un abono externo
   * también marca la factura correspondiente como pagada.
   */
  async incorporarAbonoExterno(
    dto: IncorporarAbonoExternoDto,
    ip: string,
  ): Promise<PagoResponseDto> {
    await this.asegurarSinDuplicado(dto.codigo_transaccion, ip, dto);

    // CU-46 Excepción 1: el reporte no permite identificar al cliente/contrato
    const contrato = await this.prisma.contrato.findUnique({
      where: { id_contrato: dto.codigo_abonado },
      select: { id_cliente: true },
    });

    if (!contrato || !contrato.id_cliente) {
      await this.registrarIncidencia('ABONO_CLIENTE_NO_IDENTIFICADO', dto, ip);
      throw new UnprocessableEntityException(
        'No fue posible identificar al cliente o contrato del abono — queda pendiente de revisión',
      );
    }

    // CU-46 Excepción 2: monto inválido o inconsistente. Sin pagos parciales
    // en el schema, el abono debe calzar exacto con la factura pendiente más
    // antigua del contrato — si no hay ninguna, tampoco hay contra qué aplicarlo.
    const factura = await this.prisma.factura.findFirst({
      where: {
        id_contrato: dto.codigo_abonado,
        estado: { in: ['pendiente', 'vencida'] },
      },
      orderBy: { fecha_limite_pago: 'asc' },
      select: { id_factura: true, monto: true },
    });

    if (!factura || Number(factura.monto) !== dto.monto) {
      throw new BadRequestException(
        'El monto informado es inválido o inconsistente con la deuda del contrato',
      );
    }

    return this.aplicarPago(
      { id_factura: factura.id_factura },
      contrato.id_cliente,
      dto,
      ip,
      'ABONO_ERROR_ACTUALIZAR_SALDO',
    );
  }

  /**
   * CU-45: valida que `codigo_transaccion` no esté ya registrado, antes de
   * intentar aplicar el pago. Compartido por CU-44 y CU-46 — ambos escriben
   * a la misma tabla `pago` con la misma constraint `@unique`.
   */
  private async asegurarSinDuplicado(
    codigoTransaccion: string,
    ip: string,
    payload: unknown,
  ): Promise<void> {
    let duplicado;
    try {
      duplicado = await this.prisma.pago.findUnique({
        where: { codigo_transaccion: codigoTransaccion },
      });
    } catch (err) {
      this.logger.error(
        `No se pudo consultar el historial de pagos para verificar duplicados: ${this.describirError(err)}`,
      );
      await this.registrarIncidencia(
        'HISTORIAL_NO_CONSULTABLE',
        payload,
        ip,
        err,
      );
      throw new ServiceUnavailableException(
        'No fue posible verificar duplicados en el historial de pagos — intente más tarde',
      );
    }

    if (duplicado) {
      // CU-45: "el administrador puede consultar el historial y verificar los
      // intentos de registro rechazados por código duplicado" — sin este log
      // el rechazo no queda trazado en ningún lado.
      await this.registrarIncidencia('DUPLICADO_RECHAZADO', payload, ip);
      throw new ConflictException(
        'El código de transacción ya fue registrado — pago duplicado',
      );
    }
  }

  /**
   * Núcleo compartido de CU-44/CU-46 (y futuro CU-42/43): crea el `pago` y
   * marca la `factura` correspondiente como pagada dentro de una misma
   * transacción — antes de este cambio, `registrarPagoConfirmado` solo creaba
   * el `pago` y nunca actualizaba `factura.estado`, por lo que el saldo
   * calculado en `portal.service.ts`/`deuda-publica.service.ts` (que filtra
   * `factura.estado IN ('pendiente','vencida')`) no reflejaba los pagos
   * registrados. `'pagada'` es un valor nuevo y seguro: ambos lugares usan un
   * filtro de inclusión, no un enum exhaustivo.
   */
  private async aplicarPago(
    factura: { id_factura: number },
    idCliente: number,
    datos: DatosPago,
    ip: string,
    incidenciaErrorTipo: 'ERROR_PERSISTENCIA' | 'ABONO_ERROR_ACTUALIZAR_SALDO',
  ): Promise<PagoResponseDto> {
    try {
      const pago = await this.prisma.$transaction(async (tx) => {
        const creado = await tx.pago.create({
          data: {
            id_factura: factura.id_factura,
            id_cliente: idCliente,
            monto: datos.monto,
            fecha_pago: new Date(datos.fecha_pago),
            codigo_transaccion: datos.codigo_transaccion,
            pasarela: datos.pasarela,
            token_transaccional: datos.token_transaccional,
          },
        });

        await tx.factura.update({
          where: { id_factura: factura.id_factura },
          data: { estado: 'pagada' },
        });

        return creado;
      });

      await this.prisma.log_auditoria.create({
        data: {
          accion: 'PAGO_REGISTRADO',
          entidad_afectada: 'pago',
          id_entidad_afectada: pago.id_pago,
          valor_nuevo: {
            id_factura: factura.id_factura,
            monto: datos.monto,
            codigo_transaccion: datos.codigo_transaccion,
            pasarela: datos.pasarela,
          },
          ip_origen: ip,
        },
      });

      return {
        id_pago: pago.id_pago,
        id_factura: pago.id_factura,
        id_cliente: pago.id_cliente,
        monto: Number(pago.monto),
        fecha_pago: pago.fecha_pago.toISOString(),
        codigo_transaccion: pago.codigo_transaccion,
        pasarela: pago.pasarela,
      };
    } catch (err) {
      // CU-45: dos confirmaciones casi simultáneas con el mismo codigo_transaccion
      // pueden pasar ambas el chequeo de asegurarSinDuplicado antes de que
      // cualquiera inserte. La constraint @unique de la DB es la que realmente
      // decide — si es ese el motivo del fallo, es un duplicado (409), no una
      // falla de persistencia.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        await this.registrarIncidencia('DUPLICADO_RECHAZADO', datos, ip);
        throw new ConflictException(
          'El código de transacción ya fue registrado — pago duplicado',
        );
      }

      this.logger.error(
        `Fallo al aplicar pago codigo_transaccion=${datos.codigo_transaccion}: ${this.describirError(err)}`,
      );
      await this.registrarIncidencia(incidenciaErrorTipo, datos, ip, err);
      // Nota: no hay reintento automático implementado — queda como incidencia
      // trazable en log_auditoria para revisión/reprocesamiento manual.
      throw new InternalServerErrorException(
        'No fue posible registrar el pago — reintente más tarde',
      );
    }
  }

  /**
   * CU-45: "el administrador puede consultar el historial y verificar los
   * intentos de registro rechazados por código duplicado" — lee los
   * incidentes ya registrados en `log_auditoria` por `registrarIncidencia`.
   */
  async getPagosRechazados(query: PagosRechazadosQueryDto) {
    const { codigo_transaccion, desde, hasta, page, limit } = query;

    const where: Prisma.log_auditoriaWhereInput = {
      accion: ACCION_DUPLICADO_RECHAZADO,
    };

    if (codigo_transaccion) {
      where.valor_nuevo = {
        path: ['payload', 'codigo_transaccion'],
        equals: codigo_transaccion,
      };
    }

    if (desde || hasta) {
      const fechaHora: Prisma.DateTimeFilter = {};
      if (desde) {
        const desdeDate = new Date(desde);
        desdeDate.setHours(0, 0, 0, 0);
        fechaHora.gte = desdeDate;
      }
      if (hasta) {
        const hastaDate = new Date(hasta);
        hastaDate.setHours(23, 59, 59, 999);
        fechaHora.lte = hastaDate;
      }
      where.fecha_hora = fechaHora;
    }

    const [registros, total] = await Promise.all([
      this.prisma.log_auditoria.findMany({
        where,
        orderBy: { fecha_hora: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id_log: true,
          valor_nuevo: true,
          ip_origen: true,
          fecha_hora: true,
        },
      }),
      this.prisma.log_auditoria.count({ where }),
    ]);

    return {
      data: registros.map((r) => this.mapearPagoRechazado(r)),
      total,
      page,
      limit,
    };
  }

  private mapearPagoRechazado(registro: {
    id_log: bigint;
    valor_nuevo: Prisma.JsonValue;
    ip_origen: string | null;
    fecha_hora: Date | null;
  }): PagoRechazadoDto {
    const payload =
      registro.valor_nuevo &&
      typeof registro.valor_nuevo === 'object' &&
      'payload' in registro.valor_nuevo
        ? (registro.valor_nuevo.payload as Partial<RegistrarPagoDto>)
        : undefined;

    return {
      id_log: registro.id_log.toString(),
      codigo_transaccion: payload?.codigo_transaccion ?? null,
      id_factura: payload?.id_factura ?? null,
      monto: payload?.monto ?? null,
      pasarela: payload?.pasarela ?? null,
      ip_origen: registro.ip_origen,
      fecha: registro.fecha_hora ? registro.fecha_hora.toISOString() : null,
    };
  }

  private async registrarIncidencia(
    tipo: IncidenciaTipo,
    payload: unknown,
    ip: string,
    err?: unknown,
  ) {
    await this.prisma.log_auditoria.create({
      data: {
        accion: `PAGO_INCIDENCIA_${tipo}`,
        entidad_afectada: 'pago',
        valor_nuevo: {
          payload,
          error: err === undefined ? undefined : this.describirError(err),
        } as Prisma.InputJsonValue,
        ip_origen: ip,
      },
    });
  }

  private describirError(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return JSON.stringify(err);
  }
}
