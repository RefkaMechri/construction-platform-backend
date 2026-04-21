import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { ProjectBudgetsController } from './controllers/project-budgets.controller';
import { ProjectBudgetsService } from './services/project-budgets.service';

@Module({
  controllers: [ProjectBudgetsController],
  providers: [ProjectBudgetsService, PrismaService],
  exports: [ProjectBudgetsService],
})
export class ProjectBudgetsModule {}
