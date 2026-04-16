import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { TasksController } from './controllers/tasks.controller';
import { TasksRepository } from './repositories/tasks.repository';
import { TasksService } from './services/tasks.service';
import { PhasesModule } from './phases.module';
import { TasksSchedulerService } from './services/tasks-scheduler.service';
import { ProjectsModule } from './projects.module';
import { MilestonesModule } from './milestones.module';
import { TaskSchedulingService } from './services/task-scheduling.service';

@Module({
  imports: [PhasesModule, ProjectsModule, MilestonesModule],
  controllers: [TasksController],
  providers: [
    TasksService,
    TasksRepository,
    TasksSchedulerService,
    PrismaService,
    TaskSchedulingService,
  ],
  exports: [TasksService, TaskSchedulingService],
})
export class TasksModule {}
