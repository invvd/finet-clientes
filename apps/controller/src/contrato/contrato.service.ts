import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ContratoVencimientoDto } from './dto/contrato.dto.js';

@Injectable()
export class ContratoService {
  private readonly logger = new Logger(ContratoService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * CU-54 / RF-39: asigna el día numérico del mes en que vence un contrato.
   *
   * El rango 1–28 (Excepción 2) lo valida el ZodValidationPipe en el controller, así que
   * acá el día ya llega válido.
   */
  async asignarDiaVencimiento(
    idContrato: number,
    diaVencimiento: number,
  ): Promise<ContratoVencimientoDto> {
    try {
      // Precondición del CU: "debe existir un contrato válido para configurar".
      const contrato = await this.prisma.contrato.findUnique({
        where: { id_contrato: idContrato },
        select: { id_contrato: true, dia_vencimiento: true },
      });

      if (!contrato) {
        throw new NotFoundException(
          `No existe un contrato con id ${idContrato}.`,
        );
      }

      const actualizado = await this.prisma.contrato.update({
        where: { id_contrato: idContrato },
        data: { dia_vencimiento: diaVencimiento },
        select: { id_contrato: true, dia_vencimiento: true },
      });

      // Mismo patrón de bitácora que ContratacionesService: en su propio try/catch, para
      // que un fallo de auditoría no rompa la respuesta cuando el día ya quedó guardado.
      // `id_usuario` queda null hasta que exista sesión de admin.
      try {
        await this.prisma.log_auditoria.create({
          data: {
            accion: 'ASIGNAR_DIA_VENCIMIENTO',
            entidad_afectada: 'contrato',
            id_entidad_afectada: idContrato,
            valor_anterior: { dia_vencimiento: contrato.dia_vencimiento },
            valor_nuevo: { dia_vencimiento: actualizado.dia_vencimiento },
          },
        });
      } catch (auditError) {
        this.logger.error(
          `No se pudo registrar auditoría de dia_vencimiento para contrato=${idContrato}`,
          auditError,
        );
      }

      this.logger.log(
        `Contrato ${idContrato} — día de vencimiento: ${contrato.dia_vencimiento} → ${actualizado.dia_vencimiento}`,
      );

      return actualizado;
    } catch (error) {
      // CU-54 Excepción 3: error al guardar la configuración.
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `No se pudo guardar el día de vencimiento del contrato ${idContrato}`,
        error,
      );
      throw new InternalServerErrorException(
        'No fue posible registrar el vencimiento.',
      );
    }
  }
}
