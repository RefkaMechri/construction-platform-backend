import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class DashboardAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  countUsers(tenantId: number) {
    return this.prisma.user.count({
      where: { tenantId },
    });
  }

  countProjects(tenantId: number) {
    return this.prisma.project.count({
      where: { tenantId },
    });
  }

  countProjectsByStatus(tenantId: number) {
    return this.prisma.project.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { status: true },
    });
  }

  countProjectsByType(tenantId: number) {
    return this.prisma.project.groupBy({
      by: ['type'],
      where: { tenantId },
      _count: { type: true },
    });
  }

  getRecentProjects(tenantId: number) {
    return this.prisma.project.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        code: true,
        client: true,
        status: true,
        type: true,
        budget: true,
        startDate: true,
        endDate: true,
        createdAt: true,
      },
    });
  }

  countTasksByStatus(tenantId: number) {
    return this.prisma.task.groupBy({
      by: ['status'],
      where: {
        phase: {
          project: {
            tenantId,
          },
        },
      },
      _count: { status: true },
    });
  }

  countEmployees(tenantId: number) {
    return this.prisma.employee.count({
      where: { tenantId },
    });
  }

  countEmployeesByAvailability(tenantId: number) {
    return this.prisma.employee.groupBy({
      by: ['availabilityStatus'],
      where: { tenantId },
      _count: { availabilityStatus: true },
    });
  }

  countEquipments(tenantId: number) {
    return this.prisma.equipment.count({
      where: { tenantId },
    });
  }

  countEquipmentsByAvailability(tenantId: number) {
    return this.prisma.equipment.groupBy({
      by: ['availabilityStatus'],
      where: { tenantId },
      _count: { availabilityStatus: true },
    });
  }

  countMaterials(tenantId: number) {
    return this.prisma.material.count({
      where: { tenantId },
    });
  }

  countMaterialsByAvailability(tenantId: number) {
    return this.prisma.material.groupBy({
      by: ['availabilityStatus'],
      where: { tenantId },
      _count: { availabilityStatus: true },
    });
  }

  countLowStockMaterials(tenantId: number) {
    return this.prisma.material.count({
      where: {
        tenantId,
        quantity: {
          lte: 10,
        },
      },
    });
  }

  getBudgetSummary(tenantId: number) {
    return this.prisma.projectBudget.aggregate({
      where: {
        project: {
          tenantId,
        },
      },
      _sum: {
        totalBudget: true,
        directCostsTotal: true,
        indirectCostsTotal: true,
        contingencyUsed: true,
      },
    });
  }

  countOpenAnomalies(tenantId: number) {
    return this.prisma.taskAnomaly.count({
      where: {
        status: 'OPEN',
        task: {
          phase: {
            project: {
              tenantId,
            },
          },
        },
      },
    });
  }

  countAnomaliesBySeverity(tenantId: number) {
    return this.prisma.taskAnomaly.groupBy({
      by: ['severity'],
      where: {
        status: 'OPEN',
        task: {
          phase: {
            project: {
              tenantId,
            },
          },
        },
      },
      _count: { severity: true },
    });
  }

  getLatestAnomalies(tenantId: number) {
    return this.prisma.taskAnomaly.findMany({
      where: {
        status: 'OPEN',
        task: {
          phase: {
            project: {
              tenantId,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        description: true,
        severity: true,
        status: true,
        createdAt: true,
        task: {
          select: {
            id: true,
            name: true,
            phase: {
              select: {
                project: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  countUnreadNotifications(userId: number) {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  getLatestNotifications(userId: number) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        severity: true,
        isRead: true,
        createdAt: true,
      },
    });
  }

  getProjectsCreatedByMonth(tenantId: number) {
    return this.prisma.$queryRaw`
      SELECT
        TO_CHAR("createdAt", 'YYYY-MM') AS month,
        COUNT(*)::int AS count
      FROM "projects"
      WHERE "tenantId" = ${tenantId}
      GROUP BY month
      ORDER BY month ASC
    `;
  }

  getTasksProgressByMonth(tenantId: number) {
    return this.prisma.$queryRaw`
      SELECT
        TO_CHAR(t."updatedAt", 'YYYY-MM') AS month,
        COUNT(*) FILTER (WHERE t.status = 'TODO')::int AS todo,
        COUNT(*) FILTER (WHERE t.status = 'IN_PROGRESS')::int AS "inProgress",
        COUNT(*) FILTER (WHERE t.status = 'DONE')::int AS done,
        COUNT(*) FILTER (WHERE t.status = 'BLOCKED')::int AS blocked,
        COUNT(*) FILTER (WHERE t.status = 'OVERDUE')::int AS overdue
      FROM "tasks" t
      JOIN "phases" p ON p.id = t."phaseId"
      JOIN "projects" pr ON pr.id = p."projectId"
      WHERE pr."tenantId" = ${tenantId}
      GROUP BY month
      ORDER BY month ASC
    `;
  }

  getBudgetByProject(tenantId: number) {
    return this.prisma.projectBudget.findMany({
      where: {
        project: {
          tenantId,
        },
      },
      select: {
        totalBudget: true,
        directCostsTotal: true,
        indirectCostsTotal: true,
        contingencyUsed: true,
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        totalBudget: 'desc',
      },
      take: 10,
    });
  }

  getAnomaliesByMonth(tenantId: number) {
    return this.prisma.$queryRaw`
      SELECT
        TO_CHAR(a."createdAt", 'YYYY-MM') AS month,
        COUNT(*)::int AS count
      FROM "task_anomalies" a
      JOIN "tasks" t ON t.id = a."taskId"
      JOIN "phases" p ON p.id = t."phaseId"
      JOIN "projects" pr ON pr.id = p."projectId"
      WHERE pr."tenantId" = ${tenantId}
      GROUP BY month
      ORDER BY month ASC
    `;
  }
}
