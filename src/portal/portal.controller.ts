import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PortalService } from './portal.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentClient } from '../auth/decorators/current-client.decorator.js';
import type { cliente } from '../../generated/prisma/client.js';

/**
 * Todas las rutas requieren sesión activa (JwtAuthGuard).
 * El cliente autenticado se extrae del token via @CurrentClient().
 */
@Controller('portal')
@UseGuards(JwtAuthGuard)
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  /**
   * CU-24: Panel principal del Portal Cliente
   * Devuelve cliente, contratos, deuda y tickets recientes en una sola llamada.
   * GET /portal/panel
   */
  @Get('panel')
  getPanelPrincipal(@CurrentClient() cliente: cliente) {
    return this.portalService.getPanelPrincipal(cliente.id_cliente);
  }

  /**
   * CU-23: Consultar estado operativo del contrato
   * GET /portal/contratos/estado
   */
  @Get('contratos/estado')
  getEstadoContratos(@CurrentClient() cliente: cliente) {
    return this.portalService.getEstadoContratos(cliente.id_cliente);
  }

  /**
   * CU-25 + CU-26: Plan vigente / Múltiples planes vigentes
   * Si el cliente tiene 1 contrato → CU-25.
   * Si tiene varios → CU-26 (mismo endpoint, el frontend decide la vista).
   * GET /portal/contratos/vigentes
   */
  @Get('contratos/vigentes')
  getContratosVigentes(@CurrentClient() cliente: cliente) {
    return this.portalService.getContratosVigentes(cliente.id_cliente);
  }

  /**
   * CU-27 + CU-28: Estado de deuda
   * Si tiene_deuda = false → CU-27 (cuenta al día).
   * Si tiene_deuda = true → CU-28 (muestra saldo y facturas).
   * GET /portal/deuda
   */
  @Get('deuda')
  getResumenDeuda(@CurrentClient() cliente: cliente) {
    return this.portalService.getResumenDeuda(cliente.id_cliente);
  }

  /**
   * CU-29 + CU-30: Tickets de soporte
   * Si tiene_tickets = false → CU-29 (estado vacío).
   * Si tiene_tickets = true → CU-30 (historial completo).
   * GET /portal/tickets
   * Query opcional: ?limite=N  (para traer solo los N más recientes)
   */
  @Get('tickets')
  getTickets(
    @CurrentClient() cliente: cliente,
    @Query('limite') limite?: string,
  ) {
    const limiteNum = limite ? parseInt(limite, 10) : undefined;
    return this.portalService.getTickets(cliente.id_cliente, limiteNum);
  }
}
