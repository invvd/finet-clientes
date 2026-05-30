import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Module({
  controllers: [PortalController],
  providers: [PortalService, JwtAuthGuard],
})
export class PortalModule {}
