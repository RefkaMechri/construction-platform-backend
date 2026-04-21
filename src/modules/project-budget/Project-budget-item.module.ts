import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

import { ProjectBudgetItemsService } from './services/project-budget-items.service';
import { ProjectBudgetItemsController } from './controllers/project-budget-items.controller';
import { ProjectBudgetItemsRepository } from './repositories/project-budget-items.repository';

@Module({
  controllers: [ProjectBudgetItemsController],
  providers: [
    ProjectBudgetItemsService,
    ProjectBudgetItemsRepository,
    PrismaService,
  ],
  exports: [ProjectBudgetItemsService],
})
export class ProjectBudgetItemsModule {}
