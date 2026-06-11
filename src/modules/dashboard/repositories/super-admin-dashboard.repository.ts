import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class SuperAdminDashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  countTenants() {
    return this.prisma.tenant.count();
  }

  countTenantsByStatus() {
    return this.prisma.tenant.groupBy({
      by: ['status'],
      _count: { status: true },
    });
  }

  countTenantsByPlan() {
    return this.prisma.tenant.groupBy({
      by: ['plan'],
      _count: { plan: true },
    });
  }

  countUsers() {
    return this.prisma.user.count({
      where: {
        role: {
          not: 'SUPER_ADMIN',
        },
      },
    });
  }

  countUsersByRole() {
    return this.prisma.user.groupBy({
      by: ['role'],
      where: {
        role: {
          not: 'SUPER_ADMIN',
        },
      },
      _count: { role: true },
      orderBy: {
        _count: {
          role: 'desc',
        },
      },
    });
  }

  countProjects() {
    return this.prisma.project.count();
  }

  countProjectsByStatus() {
    return this.prisma.project.groupBy({
      by: ['status'],
      _count: { status: true },
    });
  }

  countSubscriptionPlans() {
    return this.prisma.subscriptionPlan.count();
  }

  getSubscriptionPlans() {
    return this.prisma.subscriptionPlan.findMany({
      orderBy: { price: 'asc' },
      select: {
        id: true,
        name: true,
        price: true,
        period: true,
        usersLimit: true,
        projectsLimit: true,
        features: true,
      },
    });
  }

  getRecentTenants() {
    return this.prisma.tenant.findMany({
      take: 8,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        plan: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            projects: true,
          },
        },
      },
    });
  }

  getTenantsForLimitAnalysis() {
    return this.prisma.tenant.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        status: true,
        _count: {
          select: {
            users: true,
            projects: true,
          },
        },
      },
    });
  }

  getCreatedTenantsBetween(startDate: Date, endDate: Date) {
    return this.prisma.tenant.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
      },
    });
  }

  getCreatedUsersBetween(startDate: Date, endDate: Date) {
    return this.prisma.user.findMany({
      where: {
        role: {
          not: 'SUPER_ADMIN',
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
      },
    });
  }

  getCreatedProjectsBetween(startDate: Date, endDate: Date) {
    return this.prisma.project.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
      },
    });
  }
}
