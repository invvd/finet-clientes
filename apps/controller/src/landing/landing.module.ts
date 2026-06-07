import { Module } from '@nestjs/common';
import { LandingController } from './landing.controller.js';
import { LandingService } from './landing.service.js';

@Module({
  controllers: [LandingController],
  providers: [LandingService],
})
export class LandingModule {}
