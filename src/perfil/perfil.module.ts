import { Module } from '@nestjs/common';
import { PerfilController } from './perfil.controller';
import { PerfilService } from './perfil.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Module({
  controllers: [PerfilController],
  providers: [PerfilService, JwtAuthGuard],
})
export class PerfilModule {}
