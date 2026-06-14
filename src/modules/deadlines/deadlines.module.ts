import { Module } from '@nestjs/common';
import { DeadlinesController } from './controllers/deadlines.controller';
import { DeadlinesService } from './services/deadlines.service';
import { PrismaService } from 'prisma/prisma.service';
import { NotificationsModule } from '../Notification/notifications.module';
import { BudgetAlertsController } from './controllers/budget-alerts.controller';
import { BudgetAlertsService } from './services/budget-alerts.service';
import { ProjectBudgetsModule } from '../project-budget/project-budgets.module';
import { UsageAlertsService } from './services/usage-alerts.service';
import { UsageAlertsController } from './controllers/usage-alerts.controller';

@Module({
  imports: [NotificationsModule, ProjectBudgetsModule],
  controllers: [
    DeadlinesController,
    BudgetAlertsController,
    UsageAlertsController,
  ],
  providers: [
    DeadlinesService,
    PrismaService,
    BudgetAlertsService,
    UsageAlertsService,
  ],
  exports: [DeadlinesService, BudgetAlertsService, UsageAlertsService],
})
export class DeadlinesModule {}
