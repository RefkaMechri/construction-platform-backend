export class ResourceDashboardResponseDto {
  overview!: {
    totalEmployees: number;
    availableEmployees: number;
    unavailableEmployees: number;

    totalEquipments: number;
    availableEquipments: number;
    unavailableEquipments: number;

    totalMaterials: number;
    availableMaterials: number;
    lowStockMaterials: number;

    activeAssignments: number;
    estimatedDailyCost: number;

    unreadNotifications: number;
    alerts: number;
  };

  workforce!: {
    total: number;
    available: number;
    unavailable: number;
    byJobTitle: any[];
    bySkill: any[];
    topBusyEmployees: any[];
    unavailableList: any[];
  };

  equipments!: {
    total: number;
    available: number;
    unavailable: number;
    byCategory: any[];
    byOwnershipType: any[];
    byCondition: any[];
    mostUsed: any[];
    unavailableList: any[];
  };

  materials!: {
    total: number;
    available: number;
    reserved: number;
    lowStock: number;
    totalStockValue: number;
    byCategory: any[];
    criticalStock: any[];
  };

  assignments!: {
    active: number;
    employeeAssignments: number;
    equipmentAssignments: number;
    materialAssignments: number;
    upcomingEmployeeAssignments: any[];
    upcomingEquipmentAssignments: any[];
    upcomingMaterialAssignments: any[];
  };

  costs!: {
    employeesDailyCost: number;
    equipmentsDailyCost: number;
    materialsStockValue: number;
    totalDailyCost: number;
    costByProject: any[];
  };

  alerts!: {
    total: number;
    items: any[];
  };

  notifications!: {
    unread: number;
    latest: any[];
    bySeverity: Record<string, number>;
  };

  charts!: {
    resourceAvailability: any[];
    assignmentsByProject: any[];
    skillsDistribution: any[];
    employeesByJobTitle: any[];
    equipmentsByCategory: any[];
    materialsByCategory: any[];
    stockLevelChart: any[];
    resourceCostByProject: any[];
    activeAssignmentsTrend: any[];
    notificationsBySeverity: any[];
  };
}
