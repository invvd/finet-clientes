import { Module } from '@nestjs/common';
import { DeudaPublicaController } from './deuda-publica.controller';
import { DeudaPublicaService } from './deuda-publica.service';

@Module({
  controllers: [DeudaPublicaController],
  providers: [DeudaPublicaService],
})
export class DeudaPublicaModule {}
