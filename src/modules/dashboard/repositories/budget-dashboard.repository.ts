import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class BudgetDashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  getProjects(tenantId: number) {
    return this.prisma.project.findMany({
      where: { tenantId },
      include: {
        budgetDetails: true,
        phases: {
          include: {
            tasks: {
              include: {
                assignments: {
                  include: { employee: true },
                },
                assignmentsEq: {
                  include: { equipment: true },
                },
                assignmentsMt: {
                  include: { material: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  getIndirectItemsByProjectBudgetIds(projectBudgetIds: number[]) {
    if (!projectBudgetIds.length) return [];

    return this.prisma.budgetIndirectItem.findMany({
      where: {
        projectBudgetId: {
          in: projectBudgetIds,
        },
      },
      select: {
        id: true,
        amount: true,
        projectBudgetId: true,
        category: true,
        label: true,
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
      take: 6,
      select: {
        id: true,
        title: true,
        message: true,
        severity: true,
        isRead: true,
        createdAt: true,
      },
    });
  }
}
