import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { loginSchema } from './dto/login.dto.js';
import { registerSchema } from './dto/register.dto.js';
import { ZodValidationPipe } from './pipes/zod-validation.pipe.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { CurrentClient } from './decorators/current-client.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema))
    body: {
      rut: string;
      password: string;
    },
    @Req() req: Request,
  ) {
    return this.authService.login(body.rut, body.password, req.ip ?? '0.0.0.0');
  }

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60 } })
  @HttpCode(201)
  async register(
    @Body(new ZodValidationPipe(registerSchema))
    body: {
      rut: string;
      nombre_completo: string;
      email?: string;
      telefono?: string;
      password: string;
    },
    @Req() req: Request,
  ) {
    return this.authService.register(
      body.rut,
      body.nombre_completo,
      body.password,
      body.email,
      body.telefono,
      req.ip ?? '0.0.0.0',
    );
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async logout(
    @CurrentClient() cliente: { id_cliente: number } | null,
    @Req() req: Request,
  ) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token && cliente?.id_cliente) {
      await this.authService.logout(cliente.id_cliente, token);
    }
    return { message: 'Sesión cerrada exitosamente' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(
    @CurrentClient()
    cliente: { id_cliente: number } | Record<string, unknown> | null,
  ) {
    return cliente;
  }
}
