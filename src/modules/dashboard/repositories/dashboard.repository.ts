import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  findProjectsBySiteManager(siteManagerId: number) {
    return this.prisma.project.findMany({
      where: {
        siteManagerId,
        status: {
          notIn: ['ANNULE', 'TERMINE'],
        },
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
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  findUrgentTasks(siteManagerId: number) {
    return this.prisma.task.findMany({
      where: {
        phase: {
          project: {
            siteManagerId,
          },
        },
        OR: [
          { status: 'OVERDUE' },
          { status: 'BLOCKED' },
          { priority: 'URGENT' },
          { priority: 'HIGH' },
        ],
      },
      include: {
        phase: {
          include: {
            project: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { endDate: 'asc' }],
      take: 8,
    });
  }

  findRecentAnomalies(siteManagerId: number) {
    return this.prisma.taskAnomaly.findMany({
      where: {
        task: {
          phase: {
            project: {
              siteManagerId,
            },
          },
        },
      },
      include: {
        task: {
          include: {
            phase: {
              include: {
                project: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 6,
    });
  }

  findUpcomingMilestones(siteManagerId: number) {
    return this.prisma.milestone.findMany({
      where: {
        project: {
          siteManagerId,
        },
        status: {
          in: ['UPCOMING', 'READY_FOR_VALIDATION', 'DELAYED'],
        },
      },
      include: {
        project: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
      take: 6,
    });
  }
}
