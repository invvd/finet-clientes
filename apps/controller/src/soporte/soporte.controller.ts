import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../admin/guards/api-key.guard.js';
import { ZodValidationPipe } from '../auth/pipes/zod-validation.pipe.js';
import {
  actualizarTicketSchema,
  tecnicoQuerySchema,
  ticketIdSchema,
} from './dto/soporte.dto.js';
import type {
  ActualizarTicketDto,
  TecnicoQueryDto,
} from './dto/soporte.dto.js';
import { SoporteService } from './soporte.service.js';

@Controller('admin/soporte')
@UseGuards(ApiKeyGuard)
export class SoporteController {
  constructor(private readonly soporteService: SoporteService) {}

  @Get('tickets')
  getTicketsAsignados(
    @Query(new ZodValidationPipe(tecnicoQuerySchema)) query: TecnicoQueryDto,
  ) {
    return this.soporteService.getTicketsAsignados(query.id_usuario);
  }

  @Get('tickets/:id_ticket')
  getTicketDetalle(
    @Param('id_ticket', new ZodValidationPipe(ticketIdSchema)) idTicket: number,
    @Query(new ZodValidationPipe(tecnicoQuerySchema)) query: TecnicoQueryDto,
  ) {
    return this.soporteService.getTicketDetalle(idTicket, query.id_usuario);
  }

  @Patch('tickets/:id_ticket')
  actualizarTicket(
    @Param('id_ticket', new ZodValidationPipe(ticketIdSchema)) idTicket: number,
    @Body(new ZodValidationPipe(actualizarTicketSchema))
    body: ActualizarTicketDto,
  ) {
    return this.soporteService.actualizarTicket(idTicket, body);
  }
}
