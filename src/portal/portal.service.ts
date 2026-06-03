import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ContratoEstadoDto,
  ContratoResumenDto,
  FacturaPendienteDto,
  PanelPrincipalDto,
  ResumenDeudaDto,
  TicketsResponseDto,
} from './dto/portal-response.dto.js';

@Injectable()
export class PortalService {
  constructor(private readonly prisma: PrismaService) {}

  // Estados válidos según RF-20 y CU-23
  private readonly ESTADOS_CONTRATO_VALIDOS: string[] = [
    'activo',
    'suspendido',
    'en_tramite',
  ];

  //  CU-23: Consultar estado operativo del contrato
  // Retorna el estado de TODOS los contratos del cliente (puede tener varios) y se ve si esta activo, fechas e identificador ;3.
  async getEstadoContratos(idCliente: number): Promise<ContratoEstadoDto[]> {
    const contratos = await this.prisma.contrato.findMany({
      where: { id_cliente: idCliente },
      select: {
        id_contrato: true,
        estado: true,
        fecha_inicio: true,
        fecha_suspension: true,
      },
    });

    if (!contratos.length) {
      throw new NotFoundException(
        'No se encontraron contratos para este cliente',
      );
    }

    // CU-23 Excepción 3: registrar estados no reconocidos por la regla de negocio
    for (const c of contratos) {
      if (!this.ESTADOS_CONTRATO_VALIDOS.includes(c.estado)) {
        await this.prisma.log_auditoria.create({
          data: {
            accion: 'ESTADO_CONTRATO_INVALIDO',
            entidad_afectada: 'contrato',
            id_entidad_afectada: c.id_contrato,
            valor_anterior: { estado: c.estado },
          },
        });
      }
    }

    return contratos.map((c) => ({
      id_contrato: c.id_contrato,
      estado: c.estado,
      fecha_inicio: c.fecha_inicio.toISOString().split('T')[0],
      fecha_suspension: c.fecha_suspension
        ? c.fecha_suspension.toISOString().split('T')[0]
        : null,
    }));
  }

  // ─── CU-24: Panel principal del Portal Cliente ─────────────────────────────
  // Agrega toda la información del dashboard en una sola consulta.
  async getPanelPrincipal(idCliente: number): Promise<PanelPrincipalDto> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id_cliente: idCliente },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    let contratos: ContratoResumenDto[];
    let resumen_deuda: ResumenDeudaDto;
    let tickets_recientes: TicketsResponseDto;
    try {
      [contratos, resumen_deuda, tickets_recientes] = await Promise.all([
        this.getContratosVigentes(idCliente),
        this.getResumenDeuda(idCliente),
        this.getTickets(idCliente, 3),
      ]);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        'El portal no está disponible temporalmente',
      );
    }

    return {
      cliente: {
        id_cliente: cliente.id_cliente,
        nombre_completo: cliente.nombre_completo,
        rut: cliente.rut,
        email: cliente.email,
        telefono: cliente.telefono,
      },
      contratos,
      resumen_deuda,
      tickets_recientes: tickets_recientes.tickets,
    };
  }

  //CU-25 / CU-26: Plan(es) vigente(s)
  // CU-25: si hay 1 contrato → devuelve el nombre del plan.
  // CU-26: si hay múltiples contratos → devuelve el array completo.
  async getContratosVigentes(idCliente: number): Promise<ContratoResumenDto[]> {
    const contratos = await this.prisma.contrato.findMany({
      where: {
        id_cliente: idCliente,
        estado: { in: ['activo', 'suspendido'] },
      },
      include: {
        plan: {
          select: {
            id_plan: true,
            nombre_comercial: true,
            tipo_plan: true,
            velocidad_mbps: true,
            precio_mensual: true,
          },
        },
      },
      orderBy: { fecha_inicio: 'desc' },
    });

    return contratos.map((c) => ({
      id_contrato: c.id_contrato,
      estado: c.estado,
      fecha_inicio: c.fecha_inicio.toISOString().split('T')[0],
      dia_vencimiento: c.dia_vencimiento,
      plan: c.plan
        ? {
            id_plan: c.plan.id_plan,
            nombre_comercial: c.plan.nombre_comercial,
            tipo_plan: c.plan.tipo_plan,
            velocidad_mbps: c.plan.velocidad_mbps,
            precio_mensual: Number(c.plan.precio_mensual),
          }
        : null,
    }));
  }
  //CU-27 / CU-28: Estado de deuda //
  // tiene_deuda = false → el frontend muestra "cuenta al día" // tiene_deuda = true → el frontend muestra el saldo y detalle.
  async getResumenDeuda(idCliente: number): Promise<ResumenDeudaDto> {
    // Traer todos los contratos del cliente para buscar sus facturas
    const contratos = await this.prisma.contrato.findMany({
      where: { id_cliente: idCliente },
      select: { id_contrato: true },
    });

    if (!contratos.length) {
      return { tiene_deuda: false, saldo_total: 0, facturas_pendientes: [] };
    }

    const idContratos = contratos.map((c) => c.id_contrato);
    const hoy = new Date();

    const facturas = await this.prisma.factura.findMany({
      where: {
        id_contrato: { in: idContratos },
        estado: { in: ['pendiente', 'vencida'] },
      },
      orderBy: { fecha_limite_pago: 'asc' },
    });

    const facturasMapeadas: FacturaPendienteDto[] = facturas.map((f) => {
      const limite = new Date(f.fecha_limite_pago);
      const diasVencida =
        limite < hoy
          ? Math.floor((hoy.getTime() - limite.getTime()) / 86_400_000)
          : null;

      return {
        id_factura: f.id_factura,
        periodo: this.formatPeriodo(f.periodo_mes, f.periodo_anio),
        monto: Number(f.monto ?? 0),
        fecha_limite_pago: limite.toISOString().split('T')[0],
        estado: f.estado,
        dias_vencida: diasVencida,
      };
    });

    const saldo_total = facturasMapeadas.reduce((acc, f) => acc + f.monto, 0);

    // CU-27 Excepción 3: saldo negativo indica inconsistencia de datos
    if (saldo_total < 0) {
      throw new InternalServerErrorException(
        'Saldo inconsistente. Contacte al administrador.',
      );
    }

    return {
      tiene_deuda: facturasMapeadas.length > 0,
      saldo_total,
      facturas_pendientes: facturasMapeadas,
    };
  }

  // CU-29 / CU-30: Tickets de soporte :DDDDDDDDD AHGG AYUDA
  async getTickets(
    idCliente: number,
    limite?: number,
  ): Promise<TicketsResponseDto> {
    const tickets = await this.prisma.ticket.findMany({
      where: { id_cliente: idCliente },
      include: {
        categoria_falla: { select: { nombre: true } },
      },
      orderBy: { fecha_creacion: 'desc' },
      ...(limite ? { take: limite } : {}),
    });

    const ticketsMapeados = tickets.map((t) => ({
      id_ticket: t.id_ticket,
      codigo_seguimiento: t.codigo_seguimiento,
      estado: t.estado,
      prioridad: t.prioridad,
      descripcion: t.descripcion,
      fecha_creacion: t.fecha_creacion ? t.fecha_creacion.toISOString() : '',
      fecha_cierre: t.fecha_cierre ? t.fecha_cierre.toISOString() : null,
      categoria: t.categoria_falla.nombre,
      origen: t.origen,
    }));

    return {
      total: ticketsMapeados.length,
      tiene_tickets: ticketsMapeados.length > 0,
      tickets: ticketsMapeados,
    };
  }

  // variables meses xD
  private formatPeriodo(mes: number, anio: number): string {
    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    return `${meses[mes - 1]} ${anio}`;
  }
}
