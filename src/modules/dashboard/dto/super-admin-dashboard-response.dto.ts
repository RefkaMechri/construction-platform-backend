export class SuperAdminDashboardResponseDto {
  overview!: {
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;

    totalUsers: number;
    totalProjects: number;

    totalSubscriptionPlans: number;
    estimatedMonthlyRevenue: number;

    tenantsNearUsersLimit: number;
    tenantsNearProjectsLimit: number;
    alerts: number;
  };

  tenants!: {
    total: number;
    active: number;
    suspended: number;
    byPlan: any[];
    byStatus: any[];
    recent: any[];
  };

  users!: {
    total: number;
    byRole: any[];
  };

  projects!: {
    total: number;
    byStatus: any[];
  };

  subscriptions!: {
    plans: any[];
    distribution: any[];
    estimatedMonthlyRevenue: number;
    revenueByPlan: any[];
  };

  limits!: {
    alerts: any[];
    tenantsNearUsersLimit: any[];
    tenantsNearProjectsLimit: any[];
  };

  charts!: {
    tenantsByPlan: any[];
    tenantsByStatus: any[];
    usersByRole: any[];
    projectsByStatus: any[];
    monthlyGrowth: any[];
    revenueByPlan: any[];
  };
}
