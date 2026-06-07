import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ContratacionDto,
  ContratacionResponseDto,
} from './dto/contratacion.dto.js';

// ⚠ Confirmar con CRM cuál es el valor correcto para estado_pipeline al convertir desde web
const ESTADO_PIPELINE_CONVERTIDO = 'convertido';

@Injectable()
export class ContratacionesService {
  private readonly logger = new Logger(ContratacionesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async crear(dto: ContratacionDto): Promise<ContratacionResponseDto> {
    const existe = await this.prisma.cliente.findUnique({
      where: { rut: dto.rut },
      select: { id_cliente: true },
    });

    if (existe) {
      throw new ConflictException('El RUT ya está registrado');
    }

    const plan = await this.prisma.plan.findFirst({
      where: { id_plan: dto.id_plan, activo: true },
      select: { id_plan: true },
    });

    if (!plan) {
      throw new NotFoundException('El plan seleccionado no existe o no está disponible');
    }

    const hoy = new Date();

    const { id_cliente, id_contrato, id_ot } =
      await this.prisma.$transaction(async (tx) => {
        const cliente = await tx.cliente.create({
          data: {
            nombre_completo: dto.nombre_completo,
            rut: dto.rut,
            email: dto.email,
            telefono: dto.telefono ?? null,
            id_empresa: 1,
            estado: 'pendiente',
          },
        });

        const direccion = await tx.direccion_servicio.create({
          data: {
            id_cliente: cliente.id_cliente,
            direccion_completa: dto.direccion_completa,
            comuna: dto.comuna,
            ciudad: dto.ciudad ?? null,
            es_principal: true,
          },
        });

        const contrato = await tx.contrato.create({
          data: {
            id_cliente: cliente.id_cliente,
            id_plan: dto.id_plan,
            id_empresa: 1,
            estado: 'en_tramite',
            fecha_inicio: hoy,
            dia_vencimiento: 5,
          },
        });

        const ot = await tx.orden_trabajo.create({
          data: {
            id_cliente: cliente.id_cliente,
            id_direccion: direccion.id_direccion,
            id_empresa: 1,
            tipo_ot: 'instalacion',
            estado: 'pendiente',
            prioridad: 'normal',
            fecha_creacion: hoy,
          },
        });

        // ⚠ Confirmar con CRM: estado_pipeline y si necesitan id_usuario_comercial
        await tx.prospecto.create({
          data: {
            id_empresa: 1,
            id_cliente: cliente.id_cliente,
            rut: dto.rut,
            nombre_completo: dto.nombre_completo,
            email: dto.email,
            telefono: dto.telefono ?? null,
            direccion: dto.direccion_completa,
            estado_pipeline: ESTADO_PIPELINE_CONVERTIDO,
            tiempo_conversion_dias: 0,
            fecha_creacion: hoy,
            fecha_conversion: hoy,
          },
        });

        return {
          id_cliente: cliente.id_cliente,
          id_contrato: contrato.id_contrato,
          id_ot: ot.id_ot,
        };
      });

    this.logger.log(
      `Contratación creada — cliente=${id_cliente} contrato=${id_contrato} ot=${id_ot}`,
    );

    return { id_cliente, id_contrato, id_ot };
  }
}
