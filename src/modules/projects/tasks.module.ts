import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { TasksController } from './controllers/tasks.controller';
import { TasksRepository } from './repositories/tasks.repository';
import { TasksService } from './services/tasks.service';

@Module({
  controllers: [TasksController],
  providers: [TasksService, TasksRepository, PrismaService],
  exports: [TasksService],
})
export class TasksModule {}
