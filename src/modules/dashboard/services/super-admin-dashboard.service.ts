/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ForbiddenException, Injectable } from '@nestjs/common';
import { SuperAdminDashboardRepository } from '../repositories/super-admin-dashboard.repository';
import {
  SuperAdminDashboardPeriod,
  SuperAdminDashboardQueryDto,
} from '../dto/super-admin-dashboard-query.dto';

type CurrentUserLite = {
  id: number;
  role: string;
};

type LimitAlert = {
  type: 'USERS_LIMIT' | 'PROJECTS_LIMIT';
  severity: 'WARNING' | 'CRITICAL';
  tenantId: number;
  tenantName: string;
  plan: string;
  current: number;
  limit: number | string;
  usageRate: number | null;
  message: string;
};

@Injectable()
export class SuperAdminDashboardService {
  constructor(private readonly repository: SuperAdminDashboardRepository) {}

  async getDashboard(
    user: CurrentUserLite,
    query: SuperAdminDashboardQueryDto,
  ) {
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Accès réservé au super administrateur');
    }

    const { startDate, endDate } = this.resolveDateRange(query);

    const [
      totalTenants,
      tenantsByStatusRaw,
      tenantsByPlanRaw,
      totalUsers,
      usersByRoleRaw,
      totalProjects,
      projectsByStatusRaw,
      totalSubscriptionPlans,
      subscriptionPlans,
      recentTenants,
      tenantsForLimitAnalysis,
      createdTenants,
      createdUsers,
      createdProjects,
    ] = await Promise.all([
      this.repository.countTenants(),
      this.repository.countTenantsByStatus(),
      this.repository.countTenantsByPlan(),
      this.repository.countUsers(),
      this.repository.countUsersByRole(),
      this.repository.countProjects(),
      this.repository.countProjectsByStatus(),
      this.repository.countSubscriptionPlans(),
      this.repository.getSubscriptionPlans(),
      this.repository.getRecentTenants(),
      this.repository.getTenantsForLimitAnalysis(),
      this.repository.getCreatedTenantsBetween(startDate, endDate),
      this.repository.getCreatedUsersBetween(startDate, endDate),
      this.repository.getCreatedProjectsBetween(startDate, endDate),
    ]);

    const tenantsByStatus = this.formatGroupBy(tenantsByStatusRaw, 'status');

    const tenantsByPlan = this.formatGroupBy(tenantsByPlanRaw, 'plan');
    const usersByRole = this.formatGroupBy(usersByRoleRaw, 'role');
    const projectsByStatus = this.formatGroupBy(projectsByStatusRaw, 'status');

    const statusMap = this.toCountMap(tenantsByStatusRaw, 'status');
    const activeTenants = statusMap.ACTIVE || 0;
    const suspendedTenants = statusMap.SUSPENDED || 0;

    const subscriptionDistribution = this.buildSubscriptionDistribution(
      tenantsByPlanRaw,
      subscriptionPlans,
    );

    const revenueByPlan = this.buildRevenueByPlan(
      tenantsByPlanRaw,
      subscriptionPlans,
    );

    const estimatedMonthlyRevenue = revenueByPlan.reduce(
      (sum, item) => sum + item.revenue,
      0,
    );

    const limitAnalysis = this.buildLimitAlerts(
      tenantsForLimitAnalysis,
      subscriptionPlans,
    );

    const monthlyGrowth = this.buildMonthlyGrowth({
      startDate,
      endDate,
      tenants: createdTenants,
      users: createdUsers,
      projects: createdProjects,
    });

    return {
      overview: {
        totalTenants,
        activeTenants,
        suspendedTenants,

        totalUsers,
        totalProjects,

        totalSubscriptionPlans,
        estimatedMonthlyRevenue,

        tenantsNearUsersLimit: limitAnalysis.tenantsNearUsersLimit.length,
        tenantsNearProjectsLimit: limitAnalysis.tenantsNearProjectsLimit.length,
        alerts: limitAnalysis.alerts.length,
      },

      tenants: {
        total: totalTenants,
        active: activeTenants,
        suspended: suspendedTenants,
        byPlan: tenantsByPlan,
        byStatus: tenantsByStatus,
        recent: recentTenants.map((tenant) => ({
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          email: tenant.email,
          plan: tenant.plan,
          status: tenant.status,
          usersCount: tenant._count.users,
          projectsCount: tenant._count.projects,
          createdAt: tenant.createdAt,
        })),
      },

      users: {
        total: totalUsers,
        byRole: usersByRole,
      },

      projects: {
        total: totalProjects,
        byStatus: projectsByStatus,
      },

      subscriptions: {
        plans: subscriptionPlans,
        distribution: subscriptionDistribution,
        estimatedMonthlyRevenue,
        revenueByPlan,
      },

      limits: limitAnalysis,

      charts: {
        tenantsByPlan,
        tenantsByStatus,
        usersByRole,
        projectsByStatus,
        monthlyGrowth,
        revenueByPlan,
      },
    };
  }

  private resolveDateRange(query: SuperAdminDashboardQueryDto) {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    if (query.startDate) {
      return {
        startDate: new Date(query.startDate),
        endDate,
      };
    }

    const startDate = new Date(endDate);

    if (query.period === SuperAdminDashboardPeriod.MONTH) {
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate.setMonth(startDate.getMonth() - 11);
      startDate.setDate(1);
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }

  private toCountMap(items: any[], field: string): Record<string, number> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return items.reduce((acc, item) => {
      acc[item[field] || 'UNKNOWN'] = item._count[field];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return acc;
    }, {});
  }

  private formatGroupBy(items: any[], field: string) {
    return items.map((item) => ({
      name: item[field] || 'Non défini',
      value: item._count[field],
    }));
  }

  private buildSubscriptionDistribution(
    tenantsByPlanRaw: any[],
    subscriptionPlans: any[],
  ) {
    const plansMap = new Map(
      subscriptionPlans.map((plan) => [String(plan.name), plan]),
    );

    return tenantsByPlanRaw.map((item) => {
      const planName = String(item.plan);
      const subscription = plansMap.get(planName);

      return {
        plan: planName,
        tenants: item._count.plan,
        price: subscription?.price || 0,
        usersLimit: subscription?.usersLimit || null,
        projectsLimit: subscription?.projectsLimit || null,
      };
    });
  }

  private buildRevenueByPlan(
    tenantsByPlanRaw: any[],
    subscriptionPlans: any[],
  ) {
    const plansMap = new Map(
      subscriptionPlans.map((plan) => [String(plan.name), plan]),
    );

    return tenantsByPlanRaw.map((item) => {
      const planName = String(item.plan);
      const subscription = plansMap.get(planName);
      const tenants = item._count.plan;
      const price = subscription?.price || 0;

      return {
        plan: planName,
        tenants,
        price,
        revenue: tenants * price,
      };
    });
  }

  private buildLimitAlerts(tenants: any[], subscriptionPlans: any[]) {
    const plansMap = new Map(
      subscriptionPlans.map((plan) => [String(plan.name), plan]),
    );

    const alerts: LimitAlert[] = [];

    tenants.forEach((tenant) => {
      const subscription = plansMap.get(String(tenant.plan));

      if (!subscription) {
        alerts.push({
          type: 'USERS_LIMIT',
          severity: 'WARNING',
          tenantId: tenant.id,
          tenantName: tenant.name,
          plan: String(tenant.plan),
          current: tenant._count.users,
          limit: 'Plan introuvable',
          usageRate: null,
          message: `Le plan ${String(
            tenant.plan,
          )} de l'organisation ${tenant.name} est introuvable.`,
        });

        return;
      }

      const usersAlert = this.createLimitAlert({
        type: 'USERS_LIMIT',
        tenant,
        planName: subscription.name,
        current: tenant._count.users,
        limit: subscription.usersLimit,
        label: 'utilisateurs',
      });

      if (usersAlert) {
        alerts.push(usersAlert);
      }

      const projectsAlert = this.createLimitAlert({
        type: 'PROJECTS_LIMIT',
        tenant,
        planName: subscription.name,
        current: tenant._count.projects,
        limit: subscription.projectsLimit,
        label: 'projets',
      });

      if (projectsAlert) {
        alerts.push(projectsAlert);
      }
    });

    return {
      alerts: alerts.sort((a, b) => {
        if (a.severity === b.severity) return 0;
        return a.severity === 'CRITICAL' ? -1 : 1;
      }),
      tenantsNearUsersLimit: alerts.filter(
        (alert) => alert.type === 'USERS_LIMIT',
      ),
      tenantsNearProjectsLimit: alerts.filter(
        (alert) => alert.type === 'PROJECTS_LIMIT',
      ),
    };
  }

  private createLimitAlert(data: {
    type: 'USERS_LIMIT' | 'PROJECTS_LIMIT';
    tenant: any;
    planName: string;
    current: number;
    limit: string;
    label: string;
  }): LimitAlert | null {
    const normalizedLimit = String(data.limit || '')
      .trim()
      .toLowerCase();

    const isUnlimited =
      normalizedLimit === 'illimité' ||
      normalizedLimit === 'illimite' ||
      normalizedLimit === 'unlimited';

    if (isUnlimited) {
      return null;
    }

    const numericLimit = Number(data.limit);

    if (!Number.isFinite(numericLimit) || numericLimit <= 0) {
      return {
        type: data.type,
        severity: 'WARNING',
        tenantId: data.tenant.id,
        tenantName: data.tenant.name,
        plan: data.planName,
        current: data.current,
        limit: data.limit,
        usageRate: null,
        message: `La limite ${data.label} du plan ${data.planName} est invalide.`,
      };
    }

    const usageRate = Math.round((data.current / numericLimit) * 100);

    if (usageRate < 80) {
      return null;
    }

    return {
      type: data.type,
      severity: usageRate >= 100 ? 'CRITICAL' : 'WARNING',
      tenantId: data.tenant.id,
      tenantName: data.tenant.name,
      plan: data.planName,
      current: data.current,
      limit: numericLimit,
      usageRate,
      message:
        usageRate >= 100
          ? `${data.tenant.name} a atteint la limite de ${numericLimit} ${data.label}.`
          : `${data.tenant.name} utilise ${usageRate}% de sa limite ${data.label}.`,
    };
  }

  private buildMonthlyGrowth(data: {
    startDate: Date;
    endDate: Date;
    tenants: { createdAt: Date }[];
    users: { createdAt: Date }[];
    projects: { createdAt: Date }[];
  }) {
    const months = this.getMonthKeys(data.startDate, data.endDate);

    const map: Record<
      string,
      {
        month: string;
        tenants: number;
        users: number;
        projects: number;
      }
    > = {};

    months.forEach((month) => {
      map[month] = {
        month,
        tenants: 0,
        users: 0,
        projects: 0,
      };
    });

    data.tenants.forEach((item) => {
      const key = this.toMonthKey(item.createdAt);
      if (map[key]) map[key].tenants += 1;
    });

    data.users.forEach((item) => {
      const key = this.toMonthKey(item.createdAt);
      if (map[key]) map[key].users += 1;
    });

    data.projects.forEach((item) => {
      const key = this.toMonthKey(item.createdAt);
      if (map[key]) map[key].projects += 1;
    });

    return Object.values(map);
  }

  private getMonthKeys(startDate: Date, endDate: Date) {
    const keys: string[] = [];
    const cursor = new Date(startDate);

    cursor.setDate(1);
    cursor.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setDate(1);
    end.setHours(0, 0, 0, 0);

    while (cursor <= end) {
      keys.push(this.toMonthKey(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return keys;
  }

  private toMonthKey(date: Date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');

    return `${year}-${month}`;
  }
}
