import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { TaskDependenciesController } from './controllers/task-dependencies.controller';
import { TaskDependenciesRepository } from './repositories/task-dependencies.repository';
import { TaskDependenciesService } from './services/task-dependencies.service';

@Module({
  controllers: [TaskDependenciesController],
  providers: [
    TaskDependenciesService,
    TaskDependenciesRepository,
    PrismaService,
  ],
})
export class TaskDependenciesModule {}
