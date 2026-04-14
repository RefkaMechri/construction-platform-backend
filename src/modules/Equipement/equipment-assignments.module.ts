import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { EquipmentAssignmentsController } from './controllers/equipement-assignments.controller';
import { EquipmentAssignmentsService } from './services/equipmentassignments.service';
import { EquipmentAssignmentsRepository } from './repositories/equipement-assignments.repository';

@Module({
  controllers: [EquipmentAssignmentsController],
  providers: [
    EquipmentAssignmentsService,
    EquipmentAssignmentsRepository,
    PrismaService,
  ],
  exports: [EquipmentAssignmentsService],
})
export class EquipmentAssignmentsModule {}
