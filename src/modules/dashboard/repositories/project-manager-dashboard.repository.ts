import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class ProjectManagerDashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  getProjects(projectManagerId: number, tenantId: number) {
    return this.prisma.project.findMany({
      where: {
        tenantId,
        projectManagerId,
      },
      include: {
        phases: {
          include: {
            tasks: {
              include: {
                anomalies: true,
              },
            },
          },
        },
        milestones: true,
        budgetDetails: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  countUnreadNotifications(userId: number) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
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
