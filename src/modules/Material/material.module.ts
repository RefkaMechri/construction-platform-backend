import { Module } from '@nestjs/common';
import { MaterialController } from './controllers/material.controller';
import { MaterialService } from './services/material.service';
import { MaterialRepository } from './repositories/material.repository';
import { PrismaService } from 'prisma/prisma.service';
import { MaterialAssignmentsModule } from './material-assignments.module';
import { MaterialAssignmentCronService } from './services/material-assignment-cron.service';

@Module({
  imports: [MaterialAssignmentsModule],
  controllers: [MaterialController],
  providers: [
    MaterialService,
    MaterialRepository,
    PrismaService,
    MaterialAssignmentCronService,
  ],
  exports: [MaterialService],
})
export class MaterialModule {}
