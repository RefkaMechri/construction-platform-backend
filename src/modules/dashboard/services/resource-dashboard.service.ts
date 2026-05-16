/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ForbiddenException, Injectable } from '@nestjs/common';
import { ResourceDashboardRepository } from '../repositories/resource-dashboard.repository';
import { ResourceDashboardQueryDto } from '../dto/resource-dashboard-query.dto';
type ResourceDashboardAlert = {
  type: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  message: string;
  sourceType: string;
  sourceId: number;
};
@Injectable()
export class ResourceDashboardService {
  constructor(private readonly repository: ResourceDashboardRepository) {}

  async getDashboard(
    user: { id: number; tenantId?: number; role: string },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    query: ResourceDashboardQueryDto,
  ) {
    if (!user.tenantId) {
      throw new ForbiddenException('Utilisateur sans tenant');
    }

    if (user.role !== 'RESOURCE_MANAGER' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Accès réservé au responsable ressources');
    }

    const tenantId = user.tenantId;
    const today = new Date();

    const [
      totalEmployees,
      employeesAvailabilityRaw,
      employeesByJobTitleRaw,
      employeeSkillsRaw,
      unavailableEmployees,
      topBusyEmployeesRaw,

      totalEquipments,
      equipmentsAvailabilityRaw,
      equipmentsByCategoryRaw,
      equipmentsByOwnershipRaw,
      equipmentsByConditionRaw,
      unavailableEquipments,
      mostUsedEquipmentsRaw,

      totalMaterials,
      materialsAvailabilityRaw,
      materialsByCategoryRaw,
      materialsStockSummary,
      criticalStockMaterials,
      topStockMaterials,
      materialsForStockValue,

      activeEmployeeAssignments,
      activeEquipmentAssignments,
      activeMaterialAssignments,
      upcomingEmployeeAssignments,
      upcomingEquipmentAssignments,
      upcomingMaterialAssignments,

      employeesDailyCostRaw,
      equipmentsDailyCostRaw,
      assignmentsByProjectRaw,
      activeAssignmentsTrendRaw,

      unreadNotifications,
      latestNotifications,
      notificationsBySeverityRaw,
    ] = await Promise.all([
      this.repository.countEmployees(tenantId),
      this.repository.countEmployeesByAvailability(tenantId),
      this.repository.countEmployeesByJobTitle(tenantId),
      this.repository.getEmployeeSkills(tenantId),
      this.repository.getUnavailableEmployees(tenantId),
      this.repository.getTopBusyEmployees(tenantId),

      this.repository.countEquipments(tenantId),
      this.repository.countEquipmentsByAvailability(tenantId),
      this.repository.countEquipmentsByCategory(tenantId),
      this.repository.countEquipmentsByOwnershipType(tenantId),
      this.repository.countEquipmentsByCondition(tenantId),
      this.repository.getUnavailableEquipments(tenantId),
      this.repository.getMostUsedEquipments(tenantId),

      this.repository.countMaterials(tenantId),
      this.repository.countMaterialsByAvailability(tenantId),
      this.repository.countMaterialsByCategory(tenantId),
      this.repository.getMaterialsStockSummary(tenantId),
      this.repository.getCriticalStockMaterials(tenantId),
      this.repository.getTopStockMaterials(tenantId),
      this.repository.getMaterialsForStockValue(tenantId),

      this.repository.countActiveEmployeeAssignments(tenantId, today),
      this.repository.countActiveEquipmentAssignments(tenantId, today),
      this.repository.countActiveMaterialAssignments(tenantId),
      this.repository.getUpcomingEmployeeAssignments(tenantId, today),
      this.repository.getUpcomingEquipmentAssignments(tenantId, today),
      this.repository.getUpcomingMaterialAssignments(tenantId),

      this.repository.getEmployeesDailyCost(tenantId),
      this.repository.getEquipmentsDailyCost(tenantId),
      this.repository.getAssignmentsByProject(tenantId),
      this.repository.getActiveAssignmentsTrend(tenantId),

      this.repository.countUnreadNotifications(user.id),
      this.repository.getLatestNotifications(user.id),
      this.repository.countNotificationsBySeverity(user.id),
    ]);

    const employeesAvailability = this.toCountMap(
      employeesAvailabilityRaw,
      'availabilityStatus',
    );

    const equipmentsAvailability = this.toCountMap(
      equipmentsAvailabilityRaw,
      'availabilityStatus',
    );

    const materialsAvailability = this.toCountMap(
      materialsAvailabilityRaw,
      'availabilityStatus',
    );

    const notificationsBySeverity = this.toCountMap(
      notificationsBySeverityRaw,
      'severity',
    );

    const availableEmployees = employeesAvailability.AVAILABLE || 0;
    const unavailableEmployeeCount = totalEmployees - availableEmployees;

    const availableEquipments = equipmentsAvailability.AVAILABLE || 0;
    const unavailableEquipmentCount = totalEquipments - availableEquipments;

    const availableMaterials = materialsAvailability.AVAILABLE || 0;

    const employeesDailyCost = employeesDailyCostRaw._sum.dailyCost || 0;
    const equipmentsDailyCost = equipmentsDailyCostRaw._sum.dailyCost || 0;

    const materialsStockValue = materialsForStockValue.reduce(
      (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
      0,
    );

    const totalDailyCost = employeesDailyCost + equipmentsDailyCost;

    const activeAssignments =
      activeEmployeeAssignments +
      activeEquipmentAssignments +
      activeMaterialAssignments;

    const lowStockMaterials = criticalStockMaterials.length;

    const skillsDistribution = this.getSkillsDistribution(employeeSkillsRaw);

    const topBusyEmployees =
      await this.formatTopBusyEmployees(topBusyEmployeesRaw);

    const mostUsedEquipments = await this.formatMostUsedEquipments(
      mostUsedEquipmentsRaw,
    );

    const assignmentsByProject = this.formatAssignmentsByProject(
      assignmentsByProjectRaw,
    );

    const costByProject = this.formatCostByProject(assignmentsByProjectRaw);

    const activeAssignmentsTrend = this.mergeTrendRows(
      activeAssignmentsTrendRaw as any[],
    );

    const generatedAlerts = this.buildAlerts({
      criticalStockMaterials,
      unavailableEmployees,
      unavailableEquipments,
    });

    const totalAlerts = generatedAlerts.length + unreadNotifications;

    return {
      overview: {
        totalEmployees,
        availableEmployees,
        unavailableEmployees: unavailableEmployeeCount,

        totalEquipments,
        availableEquipments,
        unavailableEquipments: unavailableEquipmentCount,

        totalMaterials,
        availableMaterials,
        lowStockMaterials,

        activeAssignments,
        estimatedDailyCost: totalDailyCost,

        unreadNotifications,
        alerts: totalAlerts,
      },

      workforce: {
        total: totalEmployees,
        available: availableEmployees,
        unavailable: unavailableEmployeeCount,
        byJobTitle: this.formatGroupBy(employeesByJobTitleRaw, 'jobTitle'),
        bySkill: skillsDistribution,
        topBusyEmployees,
        unavailableList: unavailableEmployees,
      },

      equipments: {
        total: totalEquipments,
        available: availableEquipments,
        unavailable: unavailableEquipmentCount,
        byCategory: this.formatGroupBy(equipmentsByCategoryRaw, 'category'),
        byOwnershipType: this.formatGroupBy(
          equipmentsByOwnershipRaw,
          'ownershipType',
        ),
        byCondition: this.formatGroupBy(equipmentsByConditionRaw, 'condition'),
        mostUsed: mostUsedEquipments,
        unavailableList: unavailableEquipments,
      },

      materials: {
        total: totalMaterials,
        available: availableMaterials,
        reserved: materialsStockSummary._sum.reservedQuantity || 0,
        lowStock: lowStockMaterials,
        totalStockValue: materialsStockValue,
        byCategory: this.formatGroupBy(materialsByCategoryRaw, 'category'),
        criticalStock: criticalStockMaterials,
      },

      assignments: {
        active: activeAssignments,
        employeeAssignments: activeEmployeeAssignments,
        equipmentAssignments: activeEquipmentAssignments,
        materialAssignments: activeMaterialAssignments,
        upcomingEmployeeAssignments,
        upcomingEquipmentAssignments,
        upcomingMaterialAssignments,
      },

      costs: {
        employeesDailyCost,
        equipmentsDailyCost,
        materialsStockValue,
        totalDailyCost,
        costByProject,
      },

      alerts: {
        total: generatedAlerts.length,
        items: generatedAlerts,
      },

      notifications: {
        unread: unreadNotifications,
        latest: latestNotifications,
        bySeverity: notificationsBySeverity,
      },

      charts: {
        resourceAvailability: [
          {
            name: 'Employés',
            available: availableEmployees,
            unavailable: unavailableEmployeeCount,
          },
          {
            name: 'Équipements',
            available: availableEquipments,
            unavailable: unavailableEquipmentCount,
          },
          {
            name: 'Matériaux',
            available: availableMaterials,
            unavailable: totalMaterials - availableMaterials,
          },
        ],

        assignmentsByProject,

        skillsDistribution,

        employeesByJobTitle: this.formatGroupBy(
          employeesByJobTitleRaw,
          'jobTitle',
        ),

        equipmentsByCategory: this.formatGroupBy(
          equipmentsByCategoryRaw,
          'category',
        ),

        materialsByCategory: this.formatGroupBy(
          materialsByCategoryRaw,
          'category',
        ),

        stockLevelChart: topStockMaterials.map((item) => ({
          materialId: item.id,
          material: item.name,
          category: item.category,
          quantity: item.quantity,
          reserved: item.reservedQuantity,
          available: item.quantity - item.reservedQuantity,
          unit: item.unit,
        })),

        resourceCostByProject: costByProject,

        activeAssignmentsTrend,

        notificationsBySeverity: Object.entries(notificationsBySeverity).map(
          ([name, value]) => ({
            name,
            value,
          }),
        ),
      },
    };
  }

  private toCountMap(items: any[], field: string): Record<string, number> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return items.reduce((acc, item) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      acc[item[field] || 'UNKNOWN'] = item._count[field];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return acc;
    }, {});
  }

  private formatGroupBy(items: any[], field: string) {
    return items.map((item) => ({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      name: item[field] || 'Non défini',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      value: item._count[field],
    }));
  }

  private getSkillsDistribution(employees: { skills: string[] }[]) {
    const map: Record<string, number> = {};

    employees.forEach((employee) => {
      employee.skills.forEach((skill) => {
        map[skill] = (map[skill] || 0) + 1;
      });
    });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }

  private async formatTopBusyEmployees(items: any[]) {
    const ids = items.map((item) => item.employeeId);
    const employees = await this.repository.getEmployeesByIds(ids);

    return items.map((item) => {
      const employee = employees.find((e) => e.id === item.employeeId);

      return {
        employeeId: item.employeeId,
        name: employee?.name || 'Inconnu',
        jobTitle: employee?.jobTitle || null,
        availabilityStatus: employee?.availabilityStatus || null,
        assignments: item._count.employeeId,
      };
    });
  }

  private async formatMostUsedEquipments(items: any[]) {
    const ids = items.map((item) => item.equipmentId);
    const equipments = await this.repository.getEquipmentsByIds(ids);

    return items.map((item) => {
      const equipment = equipments.find((e) => e.id === item.equipmentId);

      return {
        equipmentId: item.equipmentId,
        name: equipment?.name || 'Inconnu',
        code: equipment?.code || null,
        category: equipment?.category || null,
        availabilityStatus: equipment?.availabilityStatus || null,
        assignments: item._count.equipmentId,
      };
    });
  }

  private formatAssignmentsByProject(projects: any[]) {
    return projects.map((project) => {
      let employees = 0;
      let equipments = 0;
      let materials = 0;

      project.phases.forEach((phase) => {
        phase.tasks.forEach((task) => {
          employees += task.assignments.length;
          equipments += task.assignmentsEq.length;
          materials += task.assignmentsMt.length;
        });
      });

      return {
        projectId: project.id,
        projectName: project.name,
        projectCode: project.code,
        employees,
        equipments,
        materials,
        total: employees + equipments + materials,
      };
    });
  }

  private formatCostByProject(projects: any[]) {
    return projects.map((project) => {
      let employeeAssignments = 0;
      let equipmentAssignments = 0;
      let materialAssignments = 0;

      project.phases.forEach((phase) => {
        phase.tasks.forEach((task) => {
          employeeAssignments += task.assignments.length;
          equipmentAssignments += task.assignmentsEq.length;
          materialAssignments += task.assignmentsMt.length;
        });
      });

      return {
        projectId: project.id,
        projectName: project.name,
        projectCode: project.code,
        estimatedCost:
          employeeAssignments * 100 +
          equipmentAssignments * 150 +
          materialAssignments * 50,
      };
    });
  }

  private mergeTrendRows(rows: any[]) {
    const map: Record<
      string,
      {
        month: string;
        employees: number;
        equipments: number;
        materials: number;
      }
    > = {};

    rows.forEach((row) => {
      if (!map[row.month]) {
        map[row.month] = {
          month: row.month,
          employees: 0,
          equipments: 0,
          materials: 0,
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      map[row.month].employees += Number(row.employees || 0);
      map[row.month].equipments += Number(row.equipments || 0);
      map[row.month].materials += Number(row.materials || 0);
    });

    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }

  private buildAlerts(data: {
    criticalStockMaterials: any[];
    unavailableEmployees: any[];
    unavailableEquipments: any[];
  }) {
    const alerts: ResourceDashboardAlert[] = [];

    data.criticalStockMaterials.forEach((material) => {
      alerts.push({
        type: 'LOW_STOCK',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        severity: material.quantity <= 3 ? 'CRITICAL' : 'WARNING',
        title: 'Stock faible',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        message: `${material.name} : ${material.quantity} ${material.unit} restant(s)`,
        sourceType: 'MATERIAL',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        sourceId: material.id,
      });
    });

    data.unavailableEmployees.forEach((employee) => {
      alerts.push({
        type: 'EMPLOYEE_UNAVAILABLE',
        severity: 'WARNING',
        title: 'Employé indisponible',
        message: `${employee.name} est ${employee.availabilityStatus}`,
        sourceType: 'EMPLOYEE',
        sourceId: employee.id,
      });
    });

    data.unavailableEquipments.forEach((equipment) => {
      alerts.push({
        type: 'EQUIPMENT_UNAVAILABLE',
        severity: 'WARNING',
        title: 'Équipement indisponible',
        message: `${equipment.name} est ${equipment.availabilityStatus}`,
        sourceType: 'EQUIPMENT',
        sourceId: equipment.id,
      });
    });

    return alerts.slice(0, 15);
  }
}
