import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'prisma/prisma.service';
import { NotificationsService } from 'src/modules/Notification/services/notifications.service';
import { NotificationSeverityEnum } from 'src/modules/Notification/types/notification.types';
import {
  UsageNotificationSourceType,
  UsageNotificationType,
} from '../types/usage-alert-source.type';

@Injectable()
export class UsageAlertsService {
  private readonly logger = new Logger(UsageAlertsService.name);

  private readonly warningRate = 0.8;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_SECOND)
  async handleDailyUsageChecks() {
    await this.checkTenantUsageLimits();
    this.logger.log('Vérification quotidienne des limites terminée.');
  }

  async runNow() {
    await this.checkTenantUsageLimits();

    return {
      message: 'Vérification des alertes limites exécutée avec succès',
    };
  }

  private async checkTenantUsageLimits() {
    const tenants = await this.prisma.tenant.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        plan: true,
        users: {
          select: {
            id: true,
          },
        },
        projects: {
          select: {
            id: true,
          },
        },
      },
    });

    const superAdmins = await this.prisma.user.findMany({
      where: {
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
      select: {
        id: true,
      },
    });

    for (const tenant of tenants) {
      const plan = await this.getPlanLimits(tenant.plan);

      const usersCount = tenant.users.length;
      const projectsCount = tenant.projects.length;

      await this.checkOneLimit({
        tenantId: tenant.id,
        tenantName: tenant.name,
        label: 'utilisateurs',
        count: usersCount,
        limit: plan.usersLimit,
        warningType: UsageNotificationType.USERS_LIMIT_WARNING,
        exceededType: UsageNotificationType.USERS_LIMIT_EXCEEDED,
        adminUsers: tenant.users,
        superAdmins,
      });

      await this.checkOneLimit({
        tenantId: tenant.id,
        tenantName: tenant.name,
        label: 'projets',
        count: projectsCount,
        limit: plan.projectsLimit,
        warningType: UsageNotificationType.PROJECTS_LIMIT_WARNING,
        exceededType: UsageNotificationType.PROJECTS_LIMIT_EXCEEDED,
        adminUsers: tenant.users,
        superAdmins,
      });
    }
  }

  private async getPlanLimits(planName: string): Promise<{
    usersLimit: number | null;
    projectsLimit: number | null;
  }> {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: {
        name: planName,
      },
      select: {
        usersLimit: true,
        projectsLimit: true,
      },
    });

    if (!plan) {
      return {
        usersLimit: null,
        projectsLimit: null,
      };
    }

    return {
      usersLimit: this.parseLimit(plan.usersLimit),
      projectsLimit: this.parseLimit(plan.projectsLimit),
    };
  }

  private parseLimit(value: string): number | null {
    const normalized = value.trim().toLowerCase();

    if (
      normalized.includes('illimité') ||
      normalized.includes('unlimited') ||
      normalized === '∞'
    ) {
      return null;
    }

    const number = Number(normalized.replace(/\D/g, ''));

    return Number.isFinite(number) && number > 0 ? number : null;
  }

  private async checkOneLimit(params: {
    tenantId: number;
    tenantName: string;
    label: 'utilisateurs' | 'projets';
    count: number;
    limit: number | null;
    warningType: UsageNotificationType;
    exceededType: UsageNotificationType;
    adminUsers: { id: number }[];
    superAdmins: { id: number }[];
  }) {
    if (!params.limit) return;

    const rate = params.count / params.limit;

    if (params.count > params.limit) {
      await this.notifyAdminsAndSuperAdmins({
        ...params,
        type: params.exceededType,
        title: `Limite de ${params.label} dépassée`,
        message: `Le tenant "${params.tenantName}" a dépassé la limite de ${params.label} : ${params.count}/${params.limit}.`,
        severity: NotificationSeverityEnum.CRITICAL,
      });

      return;
    }

    if (rate >= this.warningRate) {
      await this.notifyAdminsAndSuperAdmins({
        ...params,
        type: params.warningType,
        title: `Limite de ${params.label} bientôt atteinte`,
        message: `Le tenant "${params.tenantName}" approche la limite de ${params.label} : ${params.count}/${params.limit}.`,
        severity: NotificationSeverityEnum.WARNING,
      });
    }
  }

  private async notifyAdminsAndSuperAdmins(params: {
    tenantId: number;
    tenantName: string;
    label: 'utilisateurs' | 'projets';
    count: number;
    limit: number | null;
    type: UsageNotificationType;
    title: string;
    message: string;
    severity: NotificationSeverityEnum;
    adminUsers: { id: number }[];
    superAdmins: { id: number }[];
  }) {
    const tenantAdmins = await this.prisma.user.findMany({
      where: {
        tenantId: params.tenantId,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      select: {
        id: true,
      },
    });

    const receivers = [...tenantAdmins, ...params.superAdmins];

    for (const user of receivers) {
      await this.notificationsService.createIfNotExists({
        userId: user.id,
        type: params.type,
        title: params.title,
        message: params.message,
        severity: params.severity,
        sourceType: UsageNotificationSourceType.TENANT,
        sourceId: params.tenantId,
      });
    }
  }
}
