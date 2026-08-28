import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { EMPRESA_DIRECCION } from '../common/constants/empresa.js';
import type { PagoResponseDto, RegistrarPagoDto } from './dto/pagos.dto.js';
import type {
  PagoRechazadoDto,
  PagosRechazadosQueryDto,
} from './dto/pagos-rechazados.dto.js';
import type { IncorporarAbonoExternoDto } from './dto/abonos-externos.dto.js';
import type {
  ListadoPagosQueryDto,
  PagoListadoDto,
} from './dto/listado-pagos.dto.js';

const ACCION_DUPLICADO_RECHAZADO = 'PAGO_INCIDENCIA_DUPLICADO_RECHAZADO';

// CU-52: peso máximo del comprobante generado
const COMPROBANTE_MAX_BYTES = 500 * 1024;
const COMPROBANTES_DIR = path.join(process.cwd(), 'storage', 'comprobantes');

type IncidenciaTipo =
  | 'CUENTA_NO_DETERMINADA'
  | 'ERROR_PERSISTENCIA'
  | 'HISTORIAL_NO_CONSULTABLE'
  | 'DUPLICADO_RECHAZADO'
  | 'ABONO_CLIENTE_NO_IDENTIFICADO'
  | 'ABONO_ERROR_ACTUALIZAR_SALDO'
  | 'COMPROBANTE_DATOS_FALTANTES'
  | 'COMPROBANTE_ERROR_GENERACION';

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

      // CU-52: el comprobante se genera después de que el pago ya se confirmó
      // — un fallo acá nunca debe revertir ni fallar la respuesta del pago.
      const comprobantePdfUrl = await this.generarComprobante(
        {
          id_pago: pago.id_pago,
          id_cliente: pago.id_cliente,
          monto: Number(pago.monto),
          fecha_pago: pago.fecha_pago,
          codigo_transaccion: pago.codigo_transaccion,
        },
        datos,
        ip,
      );

      return {
        id_pago: pago.id_pago,
        id_factura: pago.id_factura,
        id_cliente: pago.id_cliente,
        monto: Number(pago.monto),
        fecha_pago: pago.fecha_pago.toISOString(),
        codigo_transaccion: pago.codigo_transaccion,
        pasarela: pago.pasarela,
        comprobante_pdf_url: comprobantePdfUrl,
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
   * CU-52: genera el comprobante PDF de un pago ya confirmado y lo deja
   * disponible para descarga. Nunca lanza — un fallo acá (Excepción 1: faltan
   * datos; Excepción 2: falla el generador o el PDF excede el peso máximo)
   * queda registrado como incidencia y el pago responde igual con
   * `comprobante_pdf_url: null` ("pendiente de generación").
   */
  private async generarComprobante(
    pago: {
      id_pago: number;
      id_cliente: number | null;
      monto: number;
      fecha_pago: Date;
      codigo_transaccion: string | null;
    },
    payloadIncidencia: unknown,
    ip: string,
  ): Promise<string | null> {
    try {
      if (!pago.id_cliente) {
        await this.registrarIncidencia(
          'COMPROBANTE_DATOS_FALTANTES',
          payloadIncidencia,
          ip,
        );
        return null;
      }

      // CU-52 Excepción 1: faltan datos esenciales del pago o de la empresa
      const cliente = await this.prisma.cliente.findUnique({
        where: { id_cliente: pago.id_cliente },
        select: { empresa: { select: { nombre: true, rut_empresa: true } } },
      });

      const empresa = cliente?.empresa;
      if (!empresa?.nombre || !empresa.rut_empresa) {
        await this.registrarIncidencia(
          'COMPROBANTE_DATOS_FALTANTES',
          payloadIncidencia,
          ip,
        );
        return null;
      }

      const buffer = await this.construirComprobantePdf({
        monto: pago.monto,
        fechaPago: pago.fecha_pago,
        codigoTransaccion: pago.codigo_transaccion ?? '—',
        empresaNombre: empresa.nombre,
        empresaRut: empresa.rut_empresa,
      });

      // CU-52 Excepción 2: el documento debe pesar menos de 500 KB
      if (buffer.length > COMPROBANTE_MAX_BYTES) {
        await this.registrarIncidencia(
          'COMPROBANTE_ERROR_GENERACION',
          payloadIncidencia,
          ip,
          new Error(
            `El PDF generado pesa ${buffer.length} bytes, excede el máximo de ${COMPROBANTE_MAX_BYTES}`,
          ),
        );
        return null;
      }

      await this.guardarComprobante(pago.id_pago, buffer);

      const comprobantePdfUrl = `/admin/pagos/${pago.id_pago}/comprobante`;
      await this.prisma.pago.update({
        where: { id_pago: pago.id_pago },
        data: { comprobante_pdf_url: comprobantePdfUrl },
      });

      return comprobantePdfUrl;
    } catch (err) {
      // CU-52 Excepción 2: error en el servicio generador de PDF
      this.logger.error(
        `Fallo al generar comprobante para id_pago=${pago.id_pago}: ${this.describirError(err)}`,
      );
      await this.registrarIncidencia(
        'COMPROBANTE_ERROR_GENERACION',
        payloadIncidencia,
        ip,
        err,
      );
      return null;
    }
  }

  /**
   * Arma el PDF en memoria con pdfkit — documento de texto simple, muy por
   * debajo del límite de 500 KB de CU-52.
   */
  private construirComprobantePdf(datos: {
    monto: number;
    fechaPago: Date;
    codigoTransaccion: string;
    empresaNombre: string;
    empresaRut: string;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).text(datos.empresaNombre, { align: 'center' });
      doc.fontSize(10).text(`RUT: ${datos.empresaRut}`, { align: 'center' });
      doc.text(EMPRESA_DIRECCION, { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(14).text('Comprobante de Pago', { align: 'center' });
      doc.moveDown();
      doc.fontSize(11);
      doc.text(`Código de transacción: ${datos.codigoTransaccion}`);
      doc.text(`Fecha de pago: ${datos.fechaPago.toLocaleDateString('es-CL')}`);
      doc.text(`Monto pagado: $${datos.monto.toLocaleString('es-CL')}`);

      doc.end();
    });
  }

  /**
   * Almacenamiento local en disco — interino hasta contar con credenciales de
   * un proveedor cloud real. Aislado en su propio método para que, cuando
   * llegue ese momento, el reemplazo sea solo esta función.
   */
  private async guardarComprobante(
    idPago: number,
    buffer: Buffer,
  ): Promise<void> {
    await mkdir(COMPROBANTES_DIR, { recursive: true });
    await writeFile(path.join(COMPROBANTES_DIR, `${idPago}.pdf`), buffer);
  }

  /**
   * Resuelve la ruta en disco del comprobante de un pago, para que el
   * controller lo sirva. 404 si el pago no existe o el comprobante todavía
   * no se generó (Excepción 1/2 de CU-52).
   */
  async obtenerRutaComprobante(idPago: number): Promise<string> {
    const pago = await this.prisma.pago.findUnique({
      where: { id_pago: idPago },
      select: { comprobante_pdf_url: true },
    });

    if (!pago || !pago.comprobante_pdf_url) {
      throw new NotFoundException(
        'Comprobante no encontrado o todavía no generado',
      );
    }

    return path.join(COMPROBANTES_DIR, `${idPago}.pdf`);
  }

  /**
   * CU-52: "el administrador puede acceder al comprobante generado desde el
   * historial de transacciones del sistema" — historial de pagos exitosos
   * (a diferencia de `getPagosRechazados`, que lista incidencias de
   * duplicados).
   */
  async listarPagos(query: ListadoPagosQueryDto) {
    const { desde, hasta, page, limit } = query;

    const where: Prisma.pagoWhereInput = {};

    if (desde || hasta) {
      const fechaPago: Prisma.DateTimeFilter = {};
      if (desde) {
        const desdeDate = new Date(desde);
        desdeDate.setHours(0, 0, 0, 0);
        fechaPago.gte = desdeDate;
      }
      if (hasta) {
        const hastaDate = new Date(hasta);
        hastaDate.setHours(23, 59, 59, 999);
        fechaPago.lte = hastaDate;
      }
      where.fecha_pago = fechaPago;
    }

    const [pagos, total] = await Promise.all([
      this.prisma.pago.findMany({
        where,
        orderBy: { fecha_pago: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id_pago: true,
          id_factura: true,
          id_cliente: true,
          monto: true,
          fecha_pago: true,
          codigo_transaccion: true,
          pasarela: true,
          comprobante_pdf_url: true,
        },
      }),
      this.prisma.pago.count({ where }),
    ]);

    return {
      data: pagos.map(
        (p): PagoListadoDto => ({
          id_pago: p.id_pago,
          id_factura: p.id_factura,
          id_cliente: p.id_cliente,
          monto: Number(p.monto),
          fecha_pago: p.fecha_pago.toISOString(),
          codigo_transaccion: p.codigo_transaccion,
          pasarela: p.pasarela,
          comprobante_pdf_url: p.comprobante_pdf_url,
        }),
      ),
      total,
      page,
      limit,
    };
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
