import { ForbiddenException, Injectable } from '@nestjs/common';
import { DashboardAdminRepository } from '../repositories/dashboard_admin.repository';
import { DashboardQueryDto } from '../dto/dashboard-query.dto';

@Injectable()
export class DashboardAdminService {
  constructor(private readonly dashboardRepository: DashboardAdminRepository) {}

  async getAdminTenantDashboard(
    user: { id: number; tenantId?: number; role: string },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    query: DashboardQueryDto,
  ) {
    if (!user.tenantId) {
      throw new ForbiddenException('Utilisateur sans tenant');
    }

    if (user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Accès réservé à l’administrateur du tenant',
      );
    }

    const tenantId = user.tenantId;

    const [
      totalUsers,
      totalProjects,
      projectsByStatusRaw,
      projectsByTypeRaw,
      recentProjects,
      tasksByStatusRaw,
      totalEmployees,
      employeesAvailabilityRaw,
      totalEquipments,
      equipmentsAvailabilityRaw,
      totalMaterials,
      materialsAvailabilityRaw,
      lowStockMaterials,
      budgetSummary,
      totalOpenAnomalies,
      anomaliesBySeverityRaw,
      latestAnomalies,
      unreadNotifications,
      latestNotifications,

      projectsCreatedByMonth,
      tasksProgressByMonth,
      budgetByProjectRaw,
      anomaliesByMonth,
    ] = await Promise.all([
      this.dashboardRepository.countUsers(tenantId),
      this.dashboardRepository.countProjects(tenantId),
      this.dashboardRepository.countProjectsByStatus(tenantId),
      this.dashboardRepository.countProjectsByType(tenantId),
      this.dashboardRepository.getRecentProjects(tenantId),
      this.dashboardRepository.countTasksByStatus(tenantId),
      this.dashboardRepository.countEmployees(tenantId),
      this.dashboardRepository.countEmployeesByAvailability(tenantId),
      this.dashboardRepository.countEquipments(tenantId),
      this.dashboardRepository.countEquipmentsByAvailability(tenantId),
      this.dashboardRepository.countMaterials(tenantId),
      this.dashboardRepository.countMaterialsByAvailability(tenantId),
      this.dashboardRepository.countLowStockMaterials(tenantId),
      this.dashboardRepository.getBudgetSummary(tenantId),
      this.dashboardRepository.countOpenAnomalies(tenantId),
      this.dashboardRepository.countAnomaliesBySeverity(tenantId),
      this.dashboardRepository.getLatestAnomalies(tenantId),
      this.dashboardRepository.countUnreadNotifications(user.id),
      this.dashboardRepository.getLatestNotifications(user.id),

      this.dashboardRepository.getProjectsCreatedByMonth(tenantId),
      this.dashboardRepository.getTasksProgressByMonth(tenantId),
      this.dashboardRepository.getBudgetByProject(tenantId),
      this.dashboardRepository.getAnomaliesByMonth(tenantId),
    ]);

    const projectsByStatus = this.toCountMap(projectsByStatusRaw, 'status');
    const projectsByType = this.toCountMap(projectsByTypeRaw, 'type');
    const tasksByStatus = this.toCountMap(tasksByStatusRaw, 'status');

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

    const anomaliesBySeverity = this.toCountMap(
      anomaliesBySeverityRaw,
      'severity',
    );

    const availableEmployees = employeesAvailability.AVAILABLE || 0;
    const availableEquipments = equipmentsAvailability.AVAILABLE || 0;
    const availableMaterials = materialsAvailability.AVAILABLE || 0;

    return {
      overview: {
        totalUsers,
        totalProjects,
        activeProjects: projectsByStatus.EN_COURS || 0,
        completedProjects: projectsByStatus.TERMINE || 0,
        totalEmployees,
        totalEquipments,
        totalMaterials,
        unreadNotifications,
        openAnomalies: totalOpenAnomalies,
      },

      projects: {
        byStatus: projectsByStatus,
        byType: projectsByType,
        recentProjects,
      },

      tasks: {
        total: Object.values(tasksByStatus).reduce(
          (sum: number, value: number) => sum + value,
          0,
        ),
        todo: tasksByStatus.TODO || 0,
        inProgress: tasksByStatus.IN_PROGRESS || 0,
        done: tasksByStatus.DONE || 0,
        blocked: tasksByStatus.BLOCKED || 0,
        overdue: tasksByStatus.OVERDUE || 0,
      },

      resources: {
        employees: {
          total: totalEmployees,
          available: availableEmployees,
          unavailable: totalEmployees - availableEmployees,
        },
        equipments: {
          total: totalEquipments,
          available: availableEquipments,
          unavailable: totalEquipments - availableEquipments,
        },
        materials: {
          total: totalMaterials,
          available: availableMaterials,
          lowStock: lowStockMaterials,
        },
      },

      budget: {
        totalBudget: budgetSummary._sum.totalBudget || 0,
        directCostsTotal: budgetSummary._sum.directCostsTotal || 0,
        indirectCostsTotal: budgetSummary._sum.indirectCostsTotal || 0,
        contingencyUsed: budgetSummary._sum.contingencyUsed || 0,
      },

      anomalies: {
        totalOpen: totalOpenAnomalies,
        bySeverity: anomaliesBySeverity,
        latest: latestAnomalies,
      },

      notifications: {
        unread: unreadNotifications,
        latest: latestNotifications,
      },

      charts: {
        projectsCreatedByMonth,

        tasksProgressByMonth,

        budgetByProject: budgetByProjectRaw.map((item) => ({
          projectId: item.project.id,
          projectName: item.project.name,
          projectCode: item.project.code,
          totalBudget: item.totalBudget,
          directCosts: item.directCostsTotal,
          indirectCosts: item.indirectCostsTotal,
          contingencyUsed: item.contingencyUsed,
        })),

        anomaliesByMonth,

        resourcesAvailability: [
          {
            type: 'employees',
            label: 'Employés',
            available: availableEmployees,
            unavailable: totalEmployees - availableEmployees,
          },
          {
            type: 'equipments',
            label: 'Équipements',
            available: availableEquipments,
            unavailable: totalEquipments - availableEquipments,
          },
          {
            type: 'materials',
            label: 'Matériaux',
            available: availableMaterials,
            unavailable: totalMaterials - availableMaterials,
          },
        ],
      },
    };
  }

  private toCountMap(items: any[], field: string): Record<string, number> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return items.reduce((acc, item) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      acc[item[field]] = item._count[field];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return acc;
    }, {});
  }
}
