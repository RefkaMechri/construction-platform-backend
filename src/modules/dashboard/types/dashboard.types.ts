export type DashboardStat = {
  label: string;
  value: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
};

export type SiteManagerDashboard = {
  stats: {
    totalProjects: number;
    activeProjects: number;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    blockedTasks: number;
    openAnomalies: number;
    criticalAnomalies: number;
    upcomingMilestones: number;
  };
  progress: {
    globalProgress: number;
  };
  projectsProgress: {
    id: number;
    name: string;
    code: string;
    status: string;
    progress: number;
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    openAnomalies: number;
  }[];
  urgentTasks: {
    id: number;
    name: string;
    status: string;
    priority: string;
    endDate: Date | null;
    projectName: string;
    phaseName: string;
  }[];
  recentAnomalies: {
    id: number;
    title: string;
    severity: string;
    status: string;
    createdAt: Date;
    taskName: string;
    projectName: string;
  }[];
  upcomingMilestones: {
    id: number;
    name: string;
    status: string;
    dueDate: Date;
    projectName: string;
  }[];
};

export type SuperAdminDashboard = {
  overview: {
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
  tenants: {
    total: number;
    active: number;
    suspended: number;
    byPlan: { name: string; value: number }[];
    byStatus: { name: string; value: number }[];
    recent: any[];
  };
  users: {
    total: number;
    byRole: { name: string; value: number }[];
  };
  projects: {
    total: number;
    byStatus: { name: string; value: number }[];
  };
  subscriptions: {
    plans: any[];
    distribution: any[];
    estimatedMonthlyRevenue: number;
    revenueByPlan: any[];
  };
  limits: {
    alerts: any[];
    tenantsNearUsersLimit: any[];
    tenantsNearProjectsLimit: any[];
  };
  charts: {
    tenantsByPlan: any[];
    tenantsByStatus: any[];
    usersByRole: any[];
    projectsByStatus: any[];
    monthlyGrowth: any[];
    revenueByPlan: any[];
  };
};
