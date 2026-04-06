import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { PhasesController } from './controllers/phases.controller';
import { PhasesRepository } from './repositories/phases.repository';
import { PhasesService } from './services/phases.service';
import { ProjectsModule } from './projects.module';
import { PhasesSchedulerService } from './services/phases-scheduler.service';

@Module({
  imports: [ProjectsModule],
  controllers: [PhasesController],
  providers: [
    PhasesService,
    PhasesRepository,
    PhasesSchedulerService,
    PrismaService,
  ],
  exports: [PhasesService],
})
export class PhasesModule {}
