import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { TasksController } from './controllers/tasks.controller';
import { TasksRepository } from './repositories/tasks.repository';
import { TasksService } from './services/tasks.service';
import { PhasesModule } from './phases.module';
import { TasksSchedulerService } from './services/tasks-scheduler.service';
import { ProjectsModule } from './projects.module';

@Module({
  imports: [PhasesModule, ProjectsModule],
  controllers: [TasksController],
  providers: [
    TasksService,
    TasksRepository,
    TasksSchedulerService,
    PrismaService,
  ],
  exports: [TasksService],
})
export class TasksModule {}
