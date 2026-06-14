import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'prisma/prisma.service';
import { NotificationsService } from 'src/modules/Notification/services/notifications.service';
import { NotificationSeverityEnum } from 'src/modules/Notification/types/notification.types';
import { ProjectBudgetsService } from 'src/modules/project-budget/services/project-budgets.service';
import {
  BudgetNotificationSourceType,
  BudgetNotificationType,
} from '../types/budget-alert-source.type';

@Injectable()
export class BudgetAlertsService {
  private readonly logger = new Logger(BudgetAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly projectBudgetsService: ProjectBudgetsService,
  ) {}

  @Cron(CronExpression.EVERY_SECOND)
  async handleDailyBudgetChecks() {
    await this.checkProjectBudgetAlerts();
    this.logger.log('Vérification quotidienne des alertes budget terminée.');
  }

  async runNow() {
    await this.checkProjectBudgetAlerts();

    return {
      message: 'Vérification des alertes budget exécutée avec succès',
    };
  }

  private async checkProjectBudgetAlerts() {
    const projects = await this.prisma.project.findMany({
      where: {
        status: {
          notIn: ['TERMINE', 'ANNULE'],
        },
        budgetDetails: {
          isNot: null,
        },
      },
      select: {
        id: true,
        name: true,
        projectManagerId: true,
        budgetDetails: {
          select: {
            id: true,
            totalBudget: true,
          },
        },
      },
    });

    for (const project of projects) {
      const overview =
        await this.projectBudgetsService.getProjectBudgetOverview(project.id);

      const budgetInitial = overview.budgetInitial ?? 0;
      const budgetConsomme = overview.budgetConsomme ?? 0;
      const consumptionRate = overview.consumptionRate ?? 0;

      if (budgetInitial <= 0) continue;

      if (budgetConsomme > budgetInitial) {
        await this.notificationsService.createIfNotExists({
          userId: project.projectManagerId,
          type: BudgetNotificationType.BUDGET_EXCEEDED,
          title: 'Budget projet dépassé',
          message: `Le projet "${project.name}" a dépassé son budget. Budget prévu : ${budgetInitial} TND, consommé : ${budgetConsomme} TND.`,
          severity: NotificationSeverityEnum.CRITICAL,
          sourceType: BudgetNotificationSourceType.PROJECT_BUDGET,
          sourceId: project.budgetDetails!.id,
        });

        continue;
      }

      if (consumptionRate >= 80) {
        await this.notificationsService.createIfNotExists({
          userId: project.projectManagerId,
          type: BudgetNotificationType.BUDGET_WARNING,
          title: 'Budget projet bientôt consommé',
          message: `Le projet "${project.name}" a consommé ${consumptionRate}% de son budget.`,
          severity: NotificationSeverityEnum.WARNING,
          sourceType: BudgetNotificationSourceType.PROJECT_BUDGET,
          sourceId: project.budgetDetails!.id,
        });
      }

      await this.checkPhaseBudgetAlerts(
        project.id,
        project.name,
        project.projectManagerId,
      );
    }
  }

  private async checkPhaseBudgetAlerts(
    projectId: number,
    projectName: string,
    projectManagerId: number,
  ) {
    const variance =
      await this.projectBudgetsService.getProjectDirectCostsVariance(projectId);

    for (const phase of variance.phases) {
      if (phase.actual.total <= phase.planned.total) continue;
      if (phase.planned.total <= 0) continue;

      await this.notificationsService.createIfNotExists({
        userId: projectManagerId,
        type: BudgetNotificationType.PHASE_BUDGET_EXCEEDED,
        title: 'Budget phase dépassé',
        message: `La phase "${phase.phaseName}" du projet "${projectName}" a dépassé son budget. Prévu : ${phase.planned.total} TND, consommé : ${phase.actual.total} TND.`,
        severity: NotificationSeverityEnum.ERROR,
        sourceType: BudgetNotificationSourceType.PHASE,
        sourceId: phase.phaseId,
      });
    }
  }
}
