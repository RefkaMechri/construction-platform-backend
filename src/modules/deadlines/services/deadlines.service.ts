import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'prisma/prisma.service';

import {
  NotificationSourceType,
  NotificationType,
} from '../types/deadline-source.type';

import { NotificationsService } from 'src/modules/Notification/services/notifications.service';
import { NotificationSeverityEnum } from 'src/modules/Notification/types/notification.types';

@Injectable()
export class DeadlinesService {
  private readonly logger = new Logger(DeadlinesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyChecks() {
    const { tomorrowStart, tomorrowEnd } = this.getTomorrowRange();

    await this.checkMilestonesReadyForValidation();
    await this.checkMilestonesDueTomorrow(tomorrowStart, tomorrowEnd);
    await this.checkTasksDueTomorrow(tomorrowStart, tomorrowEnd);
    await this.checkPhasesDueTomorrow(tomorrowStart, tomorrowEnd);
    await this.checkProjectsDueTomorrow(tomorrowStart, tomorrowEnd);

    await this.checkLowMaterialsStock();

    this.logger.log('Vérification quotidienne des deadlines terminée.');
  }

  async runNow() {
    const { tomorrowStart, tomorrowEnd } = this.getTomorrowRange();

    await this.checkMilestonesReadyForValidation();
    await this.checkMilestonesDueTomorrow(tomorrowStart, tomorrowEnd);
    await this.checkTasksDueTomorrow(tomorrowStart, tomorrowEnd);
    await this.checkPhasesDueTomorrow(tomorrowStart, tomorrowEnd);
    await this.checkProjectsDueTomorrow(tomorrowStart, tomorrowEnd);

    await this.checkLowMaterialsStock();

    return {
      message: 'Vérification des deadlines exécutée avec succès',
    };
  }

  private getTomorrowRange() {
    const now = new Date();

    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(now);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    tomorrowEnd.setHours(23, 59, 59, 999);

    return { tomorrowStart, tomorrowEnd };
  }

  private async createProjectManagerNotification(params: {
    projectManagerId: number;
    type: NotificationType;
    title: string;
    message: string;
    severity: NotificationSeverityEnum;
    sourceType: NotificationSourceType;
    sourceId: number;
  }) {
    return this.notificationsService.createIfNotExists({
      userId: params.projectManagerId,
      type: params.type,
      title: params.title,
      message: params.message,
      severity: params.severity,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
    });
  }

  private async createSiteManagerNotification(params: {
    siteManagerId?: number | null;
    type: NotificationType;
    title: string;
    message: string;
    severity: NotificationSeverityEnum;
    sourceType: NotificationSourceType;
    sourceId: number;
  }) {
    if (!params.siteManagerId) return null;

    return this.notificationsService.createIfNotExists({
      userId: params.siteManagerId,
      type: params.type,
      title: params.title,
      message: params.message,
      severity: params.severity,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
    });
  }

  private async createResourceManagerNotifications(params: {
    tenantId: number;
    type: NotificationType;
    title: string;
    message: string;
    severity: NotificationSeverityEnum;
    sourceType: NotificationSourceType;
    sourceId: number;
  }) {
    const resourceManagers = await this.prisma.user.findMany({
      where: {
        tenantId: params.tenantId,
        role: 'RESOURCE_MANAGER',
        status: 'ACTIVE',
      },
      select: {
        id: true,
      },
    });

    for (const manager of resourceManagers) {
      await this.notificationsService.createIfNotExists({
        userId: manager.id,
        type: params.type,
        title: params.title,
        message: params.message,
        severity: params.severity,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
      });
    }
  }

  private async checkMilestonesReadyForValidation() {
    const milestones = await this.prisma.milestone.findMany({
      where: {
        status: 'READY_FOR_VALIDATION',
      },
      include: {
        tasks: true,
        project: {
          select: {
            id: true,
            name: true,
            projectManagerId: true,
            siteManagerId: true,
          },
        },
      },
    });

    for (const milestone of milestones) {
      const common = {
        type: NotificationType.MILESTONE_READY_FOR_VALIDATION,
        title: 'Milestone prêt à être validé',
        message: `Le milestone "${milestone.name}" du projet "${milestone.project.name}" est prêt à être validé.`,
        severity: NotificationSeverityEnum.INFO,
        sourceType: NotificationSourceType.MILESTONE,
        sourceId: milestone.id,
      };

      await this.createProjectManagerNotification({
        projectManagerId: milestone.project.projectManagerId,
        ...common,
      });

      await this.createSiteManagerNotification({
        siteManagerId: milestone.project.siteManagerId,
        ...common,
      });
    }
  }

  private async checkMilestonesDueTomorrow(start: Date, end: Date) {
    const milestones = await this.prisma.milestone.findMany({
      where: {
        dueDate: {
          gte: start,
          lte: end,
        },
        status: {
          notIn: ['ACHIEVED', 'CANCELLED'],
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectManagerId: true,
            siteManagerId: true,
          },
        },
      },
    });

    for (const milestone of milestones) {
      const common = {
        type: NotificationType.MILESTONE_DUE_TOMORROW,
        title: 'Milestone à échéance demain',
        message: `Le milestone "${milestone.name}" du projet "${milestone.project.name}" arrive à échéance demain.`,
        severity: NotificationSeverityEnum.WARNING,
        sourceType: NotificationSourceType.MILESTONE,
        sourceId: milestone.id,
      };

      await this.createProjectManagerNotification({
        projectManagerId: milestone.project.projectManagerId,
        ...common,
      });

      await this.createSiteManagerNotification({
        siteManagerId: milestone.project.siteManagerId,
        ...common,
      });
    }
  }

  private async checkTasksDueTomorrow(start: Date, end: Date) {
    const tasks = await this.prisma.task.findMany({
      where: {
        endDate: {
          not: null,
          gte: start,
          lte: end,
        },
        status: {
          not: 'DONE',
        },
      },
      include: {
        phase: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                projectManagerId: true,
                siteManagerId: true,
              },
            },
          },
        },
      },
    });

    for (const task of tasks) {
      const common = {
        type: NotificationType.TASK_DUE_TOMORROW,
        title: 'Tâche à échéance demain',
        message: `La tâche "${task.name}" de la phase "${task.phase.name}" du projet "${task.phase.project.name}" arrive à échéance demain.`,
        severity: NotificationSeverityEnum.WARNING,
        sourceType: NotificationSourceType.TASK,
        sourceId: task.id,
      };

      await this.createProjectManagerNotification({
        projectManagerId: task.phase.project.projectManagerId,
        ...common,
      });

      await this.createSiteManagerNotification({
        siteManagerId: task.phase.project.siteManagerId,
        ...common,
      });
    }
  }

  private async checkPhasesDueTomorrow(start: Date, end: Date) {
    const phases = await this.prisma.phase.findMany({
      where: {
        endDate: {
          not: null,
          gte: start,
          lte: end,
        },
        status: {
          not: 'COMPLETED',
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectManagerId: true,
            siteManagerId: true,
          },
        },
      },
    });

    for (const phase of phases) {
      const common = {
        type: NotificationType.PHASE_DUE_TOMORROW,
        title: 'Phase à échéance demain',
        message: `La phase "${phase.name}" du projet "${phase.project.name}" arrive à échéance demain.`,
        severity: NotificationSeverityEnum.WARNING,
        sourceType: NotificationSourceType.PHASE,
        sourceId: phase.id,
      };

      await this.createProjectManagerNotification({
        projectManagerId: phase.project.projectManagerId,
        ...common,
      });

      await this.createSiteManagerNotification({
        siteManagerId: phase.project.siteManagerId,
        ...common,
      });
    }
  }

  private async checkProjectsDueTomorrow(start: Date, end: Date) {
    const projects = await this.prisma.project.findMany({
      where: {
        endDate: {
          gte: start,
          lte: end,
        },
        status: {
          notIn: ['TERMINE', 'ANNULE'],
        },
      },
      select: {
        id: true,
        name: true,
        projectManagerId: true,
        siteManagerId: true,
      },
    });

    for (const project of projects) {
      const common = {
        type: NotificationType.PROJECT_DUE_TOMORROW,
        title: 'Projet à échéance demain',
        message: `Le projet "${project.name}" arrive à échéance demain.`,
        severity: NotificationSeverityEnum.CRITICAL,
        sourceType: NotificationSourceType.PROJECT,
        sourceId: project.id,
      };

      await this.createProjectManagerNotification({
        projectManagerId: project.projectManagerId,
        ...common,
      });

      await this.createSiteManagerNotification({
        siteManagerId: project.siteManagerId,
        ...common,
      });
    }
  }

  private async checkLowMaterialsStock() {
    const materials = await this.prisma.material.findMany({
      where: {
        quantity: {
          lte: 10,
        },
      },
      select: {
        id: true,
        name: true,
        quantity: true,
        unit: true,
        tenantId: true,
      },
    });

    for (const material of materials) {
      await this.createResourceManagerNotifications({
        tenantId: material.tenantId,
        type: NotificationType.MATERIAL_LOW_STOCK,
        title: 'Stock matériel faible',
        message: `Le matériel "${material.name}" a un stock faible : ${material.quantity} ${material.unit}.`,
        severity: NotificationSeverityEnum.WARNING,
        sourceType: NotificationSourceType.MATERIAL,
        sourceId: material.id,
      });
    }
  }
}
