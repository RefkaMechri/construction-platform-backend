import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { GlobalTasksController } from './controllers/global-tasks.controller';
import { GlobalTasksService } from './services/global-tasks.service';

@Module({
  controllers: [GlobalTasksController],
  providers: [GlobalTasksService, PrismaService],
  exports: [GlobalTasksService],
})
export class GlobalTasksModule {}
