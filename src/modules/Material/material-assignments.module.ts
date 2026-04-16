import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { MaterialAssignmentsService } from './services/materialassignments.service';
import { MaterialAssignmentsRepository } from './repositories/material-assignments.repository';
import { MaterialAssignmentsController } from './controllers/material-assignments.controller';

@Module({
  controllers: [MaterialAssignmentsController],
  providers: [
    MaterialAssignmentsService,
    MaterialAssignmentsRepository,
    PrismaService,
  ],
  exports: [MaterialAssignmentsService],
})
export class MaterialAssignmentsModule {}
