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

  @Cron(CronExpression.EVERY_SECOND)
  async handleDailyChecks() {
    const { tomorrowStart, tomorrowEnd } = this.getTomorrowRange();

    await this.checkMilestonesReadyForValidation();
    await this.checkMilestonesDueTomorrow(tomorrowStart, tomorrowEnd);
    await this.checkTasksDueTomorrow(tomorrowStart, tomorrowEnd);
    await this.checkPhasesDueTomorrow(tomorrowStart, tomorrowEnd);
    await this.checkProjectsDueTomorrow(tomorrowStart, tomorrowEnd);
  }

  async runNow() {
    const { tomorrowStart, tomorrowEnd } = this.getTomorrowRange();

    await this.checkMilestonesReadyForValidation();
    await this.checkMilestonesDueTomorrow(tomorrowStart, tomorrowEnd);
    await this.checkTasksDueTomorrow(tomorrowStart, tomorrowEnd);
    await this.checkPhasesDueTomorrow(tomorrowStart, tomorrowEnd);
    await this.checkProjectsDueTomorrow(tomorrowStart, tomorrowEnd);

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

  /**
   * 1) Milestone prêt à être validé
   * Condition :
   * - milestone  déjà READY_FOR_VALIDATION
   */
  private async checkMilestonesReadyForValidation() {
    const milestones = await this.prisma.milestone.findMany({
      where: {
        status: 'READY_FOR_VALIDATION',
      },
      include: {
        tasks: {
          select: {
            id: true,
            name: true,
            status: true,
            milestoneId: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            projectManagerId: true,
          },
        },
      },
    });

    for (const milestone of milestones) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const notif = await this.notificationsService.createIfNotExists({
        userId: milestone.project.projectManagerId,
        type: NotificationType.MILESTONE_READY_FOR_VALIDATION,
        title: 'Milestone prêt à être validé',
        message: `Le milestone "${milestone.name}" du projet "${milestone.project.name}" est prêt à être validé.`,
        severity: NotificationSeverityEnum.INFO,
        sourceType: NotificationSourceType.MILESTONE,
        sourceId: milestone.id,
      });
    }
  }

  /**
   * 2) Milestone demain deadline
   * dueDate = demain
   * status != ACHIEVED && status != CANCELLED
   */
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
          },
        },
      },
    });

    for (const milestone of milestones) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const notif = await this.notificationsService.createIfNotExists({
        userId: milestone.project.projectManagerId,
        type: NotificationType.MILESTONE_DUE_TOMORROW,
        title: 'Milestone à échéance demain',
        message: `Le milestone "${milestone.name}" du projet "${milestone.project.name}" arrive à échéance demain.`,
        severity: NotificationSeverityEnum.WARNING,
        sourceType: NotificationSourceType.MILESTONE,
        sourceId: milestone.id,
      });
    }
  }

  /**
   * 3) Task demain deadline
   * endDate = demain
   * status != DONE
   */
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
              },
            },
          },
        },
      },
    });

    for (const task of tasks) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const notif = await this.notificationsService.createIfNotExists({
        userId: task.phase.project.projectManagerId,
        type: NotificationType.TASK_DUE_TOMORROW,
        title: 'Tâche à échéance demain',
        message: `La tâche "${task.name}" de la phase "${task.phase.name}" du projet "${task.phase.project.name}" arrive à échéance demain.`,
        severity: NotificationSeverityEnum.WARNING,
        sourceType: NotificationSourceType.TASK,
        sourceId: task.id,
      });
    }
  }

  /**
   * 4) Phase demain deadline
   * endDate = demain
   * status != COMPLETED
   */
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
          },
        },
      },
    });

    for (const phase of phases) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const notif = await this.notificationsService.createIfNotExists({
        userId: phase.project.projectManagerId,
        type: NotificationType.PHASE_DUE_TOMORROW,
        title: 'Phase à échéance demain',
        message: `La phase "${phase.name}" du projet "${phase.project.name}" arrive à échéance demain.`,
        severity: NotificationSeverityEnum.WARNING,
        sourceType: NotificationSourceType.PHASE,
        sourceId: phase.id,
      });
    }
  }

  /**
   * 5) Project demain deadline
   * endDate = demain
   * status != TERMINE && status != ANNULE
   */
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
        endDate: true,
        status: true,
        projectManagerId: true,
      },
    });

    for (const project of projects) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const notif = await this.notificationsService.createIfNotExists({
        userId: project.projectManagerId,
        type: NotificationType.PROJECT_DUE_TOMORROW,
        title: 'Projet à échéance demain',
        message: `Le projet "${project.name}" arrive à échéance demain.`,
        severity: NotificationSeverityEnum.CRITICAL,
        sourceType: NotificationSourceType.PROJECT,
        sourceId: project.id,
      });
    }
  }
}
