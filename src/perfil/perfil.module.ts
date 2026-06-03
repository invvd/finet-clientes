import { Module } from '@nestjs/common';
import { PerfilController } from './perfil.controller.js';
import { PerfilService } from './perfil.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Module({
  controllers: [PerfilController],
  providers: [PerfilService, JwtAuthGuard],
})
export class PerfilModule {}
