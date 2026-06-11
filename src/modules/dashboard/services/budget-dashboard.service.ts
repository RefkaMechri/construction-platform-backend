import { ForbiddenException, Injectable } from '@nestjs/common';
import { BudgetDashboardRepository } from '../repositories/budget-dashboard.repository';
import { DashboardQueryDto } from '../dto/dashboard-query.dto';

type BudgetHealth = 'HEALTHY' | 'WARNING' | 'OVER_BUDGET';

@Injectable()
export class BudgetDashboardService {
  constructor(private readonly repository: BudgetDashboardRepository) {}

  async getDashboard(
    user: { id: number; tenantId?: number; role: string },
    query: DashboardQueryDto,
  ) {
    void query;

    if (!user.tenantId) {
      throw new ForbiddenException('Utilisateur sans tenant');
    }

    if (user.role !== 'FINANCIAL_MANAGER' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Accès réservé au responsable financier');
    }

    const tenantId = user.tenantId;

    const [projects, unreadNotifications, latestNotifications] =
      await Promise.all([
        this.repository.getProjects(tenantId),
        this.repository.countUnreadNotifications(user.id),
        this.repository.getLatestNotifications(user.id),
      ]);

    const projectBudgetIds = projects
      .map((project) => project.budgetDetails?.id)
      .filter((id): id is number => typeof id === 'number');

    const indirectItems =
      await this.repository.getIndirectItemsByProjectBudgetIds(
        projectBudgetIds,
      );

    const indirectItemsByBudgetId = new Map<number, typeof indirectItems>();

    for (const item of indirectItems) {
      const current = indirectItemsByBudgetId.get(item.projectBudgetId) || [];
      current.push(item);
      indirectItemsByBudgetId.set(item.projectBudgetId, current);
    }

    const projectRows = projects.map((project) => {
      let plannedDirectCosts = 0;
      let consumedDirectCosts = 0;

      for (const phase of project.phases) {
        for (const task of phase.tasks) {
          const consumePlanned =
            task.status === 'IN_PROGRESS' || task.status === 'DONE';

          for (const assignment of task.assignments) {
            const dailyCost = assignment.employee.dailyCost ?? 0;
            const days = this.calculateInclusiveDays(
              assignment.startDate,
              assignment.endDate,
            );

            plannedDirectCosts += dailyCost * days;

            if (consumePlanned) {
              consumedDirectCosts += dailyCost * days;
            }
          }

          for (const assignment of task.assignmentsEq) {
            const dailyCost = assignment.equipment.dailyCost ?? 0;
            const days = this.calculateInclusiveDays(
              assignment.startDate,
              assignment.endDate,
            );

            plannedDirectCosts += dailyCost * days;

            if (consumePlanned) {
              consumedDirectCosts += dailyCost * days;
            }
          }

          for (const assignment of task.assignmentsMt) {
            const unitPrice = assignment.material.unitPrice ?? 0;

            plannedDirectCosts += assignment.quantity * unitPrice;
            consumedDirectCosts += assignment.usedQuantity * unitPrice;
          }
        }
      }

      const projectIndirectItems = project.budgetDetails?.id
        ? indirectItemsByBudgetId.get(project.budgetDetails.id) || []
        : [];

      const indirectCosts = projectIndirectItems.reduce(
        (sum, item) => sum + (item.amount ?? 0),
        0,
      );

      const contingencyRate = project.budgetDetails?.contingencyRate ?? 0;

      const contingencyAmount =
        ((plannedDirectCosts + indirectCosts) * contingencyRate) / 100;

      const plannedBudget =
        plannedDirectCosts + indirectCosts + contingencyAmount;

      const consumedBudget = consumedDirectCosts;
      const remainingBudget = plannedBudget - consumedBudget;
      const variance = consumedBudget - plannedBudget;

      const consumptionRate =
        plannedBudget > 0
          ? Math.round((consumedBudget / plannedBudget) * 100)
          : 0;

      const health = this.getHealth(consumptionRate, variance);

      return {
        id: project.id,
        code: project.code,
        name: project.name,
        status: project.status,

        plannedDirectCosts,
        consumedDirectCosts,
        indirectCosts,
        contingencyAmount,

        plannedBudget,
        consumedBudget,
        remainingBudget,
        variance,
        consumptionRate,
        health,
      };
    });

    const totalPlannedBudget = this.sum(projectRows, 'plannedBudget');
    const totalConsumedBudget = this.sum(projectRows, 'consumedBudget');
    const totalRemainingBudget = totalPlannedBudget - totalConsumedBudget;
    const globalVariance = totalConsumedBudget - totalPlannedBudget;

    const overBudgetProjects = projectRows.filter(
      (p) => p.health === 'OVER_BUDGET',
    ).length;

    const warningProjects = projectRows.filter(
      (p) => p.health === 'WARNING',
    ).length;

    const healthyProjects = projectRows.filter(
      (p) => p.health === 'HEALTHY',
    ).length;

    const alerts = this.buildAlerts(projectRows);

    return {
      overview: {
        totalProjects: projects.length,
        activeProjects: projects.filter((p) => p.status === 'EN_COURS').length,

        totalPlannedBudget,
        totalConsumedBudget,
        totalRemainingBudget,
        globalVariance,

        overBudgetProjects,
        warningProjects,
        healthyProjects,

        unreadNotifications,
        financialAlerts: alerts.length,
      },

      portfolioHealth: {
        healthy: healthyProjects,
        warning: warningProjects,
        overBudget: overBudgetProjects,
      },

      costs: {
        plannedDirectCosts: this.sum(projectRows, 'plannedDirectCosts'),
        consumedDirectCosts: this.sum(projectRows, 'consumedDirectCosts'),
        indirectCosts: this.sum(projectRows, 'indirectCosts'),
        contingencyAmount: this.sum(projectRows, 'contingencyAmount'),
        totalBudget: totalPlannedBudget,
      },

      charts: {
        budgetByProject: projectRows.map((project) => ({
          name: project.code,
          budget: project.plannedBudget,
        })),

        plannedVsConsumedByProject: projectRows.map((project) => ({
          name: project.code,
          prevu: project.plannedBudget,
          consomme: project.consumedBudget,
        })),

        costDistribution: [
          {
            name: 'Coûts directs prévus',
            value: this.sum(projectRows, 'plannedDirectCosts'),
          },
          {
            name: 'Coûts directs consommés',
            value: this.sum(projectRows, 'consumedDirectCosts'),
          },
          {
            name: 'Frais généraux',
            value: this.sum(projectRows, 'indirectCosts'),
          },
          {
            name: 'Imprévus',
            value: this.sum(projectRows, 'contingencyAmount'),
          },
        ],

        projectHealth: [
          { name: 'Sous contrôle', value: healthyProjects },
          { name: 'À surveiller', value: warningProjects },
          { name: 'Dépassement', value: overBudgetProjects },
        ],
      },

      projects: projectRows.map((project) => ({
        id: project.id,
        code: project.code,
        name: project.name,
        status: project.status,
        plannedBudget: project.plannedBudget,
        consumedBudget: project.consumedBudget,
        remainingBudget: project.remainingBudget,
        variance: project.variance,
        consumptionRate: project.consumptionRate,
        health: project.health,
      })),

      alerts: {
        total: alerts.length,
        items: alerts,
      },

      notifications: {
        unread: unreadNotifications,
        latest: latestNotifications,
      },
    };
  }

  private calculateInclusiveDays(startDate: Date, endDate: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;

    const start = new Date(startDate);
    const end = new Date(endDate);

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
  }

  private getHealth(consumptionRate: number, variance: number): BudgetHealth {
    if (variance > 0 || consumptionRate > 100) return 'OVER_BUDGET';
    if (consumptionRate >= 80) return 'WARNING';
    return 'HEALTHY';
  }

  private sum(items: any[], field: string): number {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return items.reduce((total, item) => total + (item[field] ?? 0), 0);
  }

  private buildAlerts(projects: any[]) {
    return projects
      .filter(
        (project) =>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          project.health === 'OVER_BUDGET' || project.health === 'WARNING',
      )
      .map((project) => ({
        type:
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          project.health === 'OVER_BUDGET' ? 'BUDGET_OVER' : 'BUDGET_WARNING',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        severity: project.health === 'OVER_BUDGET' ? 'CRITICAL' : 'WARNING',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        title:
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          project.health === 'OVER_BUDGET'
            ? 'Dépassement budgétaire'
            : 'Budget à surveiller',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        message: `${project.code} - ${project.name} : ${project.consumptionRate}% consommé`,
        sourceType: 'PROJECT',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        sourceId: project.id,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        amount: project.variance,
      }))
      .slice(0, 10);
  }
}
