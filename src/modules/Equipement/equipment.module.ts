import { Module } from '@nestjs/common';
import { EquipmentController } from './controllers/equipment.controller';
import { EquipmentService } from './services/equipment.service';
import { EquipmentRepository } from './repositories/equipment.repository';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [EquipmentController],
  providers: [EquipmentService, EquipmentRepository, PrismaService],
  exports: [EquipmentService],
})
export class EquipmentModule {}
