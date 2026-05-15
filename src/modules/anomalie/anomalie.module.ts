import { Module } from '@nestjs/common';
import { AnomalieController } from './controllers/anomalie.controller';
import { AnomalieService } from './services/anomalie.service';
import { AnomalieRepository } from './repositories/anomalie.repository';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [AnomalieController],
  providers: [AnomalieService, AnomalieRepository, PrismaService],
  exports: [AnomalieService],
})
export class AnomalieModule {}
