import {
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

@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * CU-44: registra un pago confirmado por la entidad recaudadora
   * (recaudación externa vía CU-46 en este incremento; pasarela vía CU-42/43
   * más adelante — ambas entran por la misma interfaz de dominio).
   *
   * CU-45: `codigo_transaccion` es único a nivel de DB (`pago` @unique), pero
   * se valida antes del insert para devolver un 409 de negocio en vez de un
   * error crudo de constraint.
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
    // CU-45 Excepción 2: el historial de pagos no puede consultarse
    let duplicado;
    try {
      duplicado = await this.prisma.pago.findUnique({
        where: { codigo_transaccion: dto.codigo_transaccion },
      });
    } catch (err) {
      this.logger.error(
        `No se pudo consultar el historial de pagos para verificar duplicados: ${this.describirError(err)}`,
      );
      await this.registrarIncidencia('HISTORIAL_NO_CONSULTABLE', dto, ip, err);
      throw new ServiceUnavailableException(
        'No fue posible verificar duplicados en el historial de pagos — intente más tarde',
      );
    }

    if (duplicado) {
      // CU-45: "el administrador puede consultar el historial y verificar los
      // intentos de registro rechazados por código duplicado" — sin este log
      // el rechazo no queda trazado en ningún lado.
      await this.registrarIncidencia('DUPLICADO_RECHAZADO', dto, ip);
      throw new ConflictException(
        'El código de transacción ya fue registrado — pago duplicado',
      );
    }

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

    // CU-44 Excepción 3: falla de persistencia
    try {
      const pago = await this.prisma.pago.create({
        data: {
          id_factura: dto.id_factura,
          id_cliente: factura.contrato.id_cliente,
          monto: dto.monto,
          fecha_pago: new Date(dto.fecha_pago),
          codigo_transaccion: dto.codigo_transaccion,
          pasarela: dto.pasarela,
          token_transaccional: dto.token_transaccional,
        },
      });

      await this.prisma.log_auditoria.create({
        data: {
          accion: 'PAGO_REGISTRADO',
          entidad_afectada: 'pago',
          id_entidad_afectada: pago.id_pago,
          valor_nuevo: {
            id_factura: dto.id_factura,
            monto: dto.monto,
            codigo_transaccion: dto.codigo_transaccion,
            pasarela: dto.pasarela,
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
      // pueden pasar ambas el findUnique de arriba antes de que cualquiera inserte.
      // La constraint @unique de la DB es la que realmente decide — si es ese el
      // motivo del fallo, es un duplicado (409), no una falla de persistencia.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        await this.registrarIncidencia('DUPLICADO_RECHAZADO', dto, ip);
        throw new ConflictException(
          'El código de transacción ya fue registrado — pago duplicado',
        );
      }

      this.logger.error(
        `Fallo al persistir pago codigo_transaccion=${dto.codigo_transaccion}: ${String(err)}`,
      );
      await this.registrarIncidencia('ERROR_PERSISTENCIA', dto, ip, err);
      // Nota: no hay reintento automático implementado — queda como incidencia
      // trazable en log_auditoria para revisión manual (ver CU-44 Excepción 3).
      throw new InternalServerErrorException(
        'No fue posible registrar el pago — reintente más tarde',
      );
    }
  }

  private async registrarIncidencia(
    tipo:
      | 'CUENTA_NO_DETERMINADA'
      | 'ERROR_PERSISTENCIA'
      | 'HISTORIAL_NO_CONSULTABLE'
      | 'DUPLICADO_RECHAZADO',
    dto: RegistrarPagoDto,
    ip: string,
    err?: unknown,
  ) {
    await this.prisma.log_auditoria.create({
      data: {
        accion: `PAGO_INCIDENCIA_${tipo}`,
        entidad_afectada: 'pago',
        valor_nuevo: {
          payload: dto,
          error: err === undefined ? undefined : this.describirError(err),
        },
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
