import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { loginSchema } from './dto/login.dto.js';
import { registerSchema } from './dto/register.dto.js';
import { recuperarPasswordSchema } from './dto/recuperar-password.dto.js';
import { restablecerPasswordSchema } from './dto/restablecer-password.dto.js';
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
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(
      body.rut,
      body.password,
      req.ip ?? '0.0.0.0',
    );
    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    return result;
  }

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60 } })
  @HttpCode(201)
  async register(
    @Body(new ZodValidationPipe(registerSchema))
    body: {
      rut: string;
      nombre_completo: string;
      email: string;
      telefono?: string;
      password: string;
      password_confirmation: string;
    },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(
      body.rut,
      body.nombre_completo,
      body.password,
      req.ip ?? '0.0.0.0',
      body.email,
      body.telefono,
    );
    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    return result;
  }

  @Post('recuperar-password')
  @Throttle({ default: { limit: 3, ttl: 60 } })
  @HttpCode(200)
  async recuperarPassword(
    @Body(new ZodValidationPipe(recuperarPasswordSchema))
    body: { rut: string },
    @Req() req: Request,
  ) {
    return this.authService.recuperarPassword(body.rut, req.ip);
  }

  @Post('restablecer-password')
  @Throttle({ default: { limit: 3, ttl: 60 } })
  @HttpCode(200)
  async restablecerPassword(
    @Body(new ZodValidationPipe(restablecerPasswordSchema))
    body: {
      token: string;
      password: string;
    },
  ) {
    return this.authService.restablecerPassword(body.token, body.password);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async logout(
    @CurrentClient() cliente: { id_cliente: number } | null,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token =
      req.headers.authorization?.replace('Bearer ', '') ||
      (req.cookies as Record<string, string> | undefined)?.access_token;
    if (token && cliente?.id_cliente) {
      await this.authService.logout(cliente.id_cliente, token);
    }
    res.clearCookie('access_token', { path: '/' });
    return { message: 'Sesión cerrada exitosamente' };
  }
}
