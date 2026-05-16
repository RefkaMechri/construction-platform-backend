export class AdminTenantDashboardResponseDto {
  overview!: {
    totalUsers: number;
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalEmployees: number;
    totalEquipments: number;
    totalMaterials: number;
    unreadNotifications: number;
    openAnomalies: number;
  };

  projects!: {
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    recentProjects: any[];
  };

  tasks!: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    blocked: number;
    overdue: number;
  };

  resources!: {
    employees: {
      total: number;
      available: number;
      unavailable: number;
    };
    equipments: {
      total: number;
      available: number;
      unavailable: number;
    };
    materials: {
      total: number;
      available: number;
      lowStock: number;
    };
  };

  budget!: {
    totalBudget: number;
    directCostsTotal: number;
    indirectCostsTotal: number;
    contingencyUsed: number;
  };

  anomalies!: {
    totalOpen: number;
    bySeverity: Record<string, number>;
    latest: any[];
  };

  notifications!: {
    unread: number;
    latest: any[];
  };

  charts!: {
    projectsCreatedByMonth: any[];
    tasksProgressByMonth: any[];
    budgetByProject: any[];
    anomaliesByMonth: any[];
    resourcesAvailability: any[];
  };
}
