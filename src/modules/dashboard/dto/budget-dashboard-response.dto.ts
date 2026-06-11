export class BudgetDashboardResponseDto {
  overview!: {
    totalProjects: number;
    activeProjects: number;

    totalPlannedBudget: number;
    totalConsumedBudget: number;
    totalRemainingBudget: number;
    globalVariance: number;

    overBudgetProjects: number;
    warningProjects: number;
    healthyProjects: number;

    unreadNotifications: number;
    financialAlerts: number;
  };

  portfolioHealth!: {
    healthy: number;
    warning: number;
    overBudget: number;
  };

  costs!: {
    plannedDirectCosts: number;
    consumedDirectCosts: number;
    indirectCosts: number;
    contingencyAmount: number;
    totalBudget: number;
  };

  charts!: {
    budgetByProject: any[];
    plannedVsConsumedByProject: any[];
    costDistribution: any[];
    projectHealth: any[];
  };

  projects!: {
    id: number;
    code: string;
    name: string;
    status: string;
    plannedBudget: number;
    consumedBudget: number;
    remainingBudget: number;
    variance: number;
    consumptionRate: number;
    health: 'HEALTHY' | 'WARNING' | 'OVER_BUDGET';
  }[];

  alerts!: {
    total: number;
    items: any[];
  };

  notifications!: {
    unread: number;
    latest: any[];
  };
}
