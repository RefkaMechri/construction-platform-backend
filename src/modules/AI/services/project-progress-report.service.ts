/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { OpenRouterProjectProgressReportService } from './openrouter-project-progress-report.service';

type CurrentUser = {
  id: number;
  tenantId: number | null;
  role: string;
};

type GenerateProgressReportOptions = {
  periodStart?: string;
  periodEnd?: string;
};

@Injectable()
export class ProjectProgressReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openRouterReportService: OpenRouterProjectProgressReportService,
  ) {}

  private calculateDurationDays(startDate: Date | null, endDate: Date | null) {
    if (!startDate || !endDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    return (
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
  }

  private calculateProgress(tasks: { status: string }[]) {
    if (!tasks.length) return 0;

    const completed = tasks.filter((task) => task.status === 'DONE').length;
    return Math.round((completed / tasks.length) * 100);
  }

  private getTaskStatistics(tasks: { status: string }[]) {
    return {
      total: tasks.length,
      completed: tasks.filter((task) => task.status === 'DONE').length,
      inProgress: tasks.filter((task) => task.status === 'IN_PROGRESS').length,
      todo: tasks.filter((task) => task.status === 'TODO').length,
      blocked: tasks.filter((task) => task.status === 'BLOCKED').length,
      overdue: tasks.filter((task) => task.status === 'OVERDUE').length,
    };
  }

  private getAnomalyStatistics(
    anomalies: { status: string; severity: string }[],
  ) {
    const open = anomalies.filter((anomaly) => anomaly.status === 'OPEN');

    return {
      totalOpen: open.length,
      critical: open.filter((a) => a.severity === 'CRITICAL').length,
      high: open.filter((a) => a.severity === 'HIGH').length,
      medium: open.filter((a) => a.severity === 'MEDIUM').length,
      low: open.filter((a) => a.severity === 'LOW').length,
    };
  }

  async getProjectDataForReport(
    projectId: number,
    tenantId: number,
    options?: GenerateProgressReportOptions,
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        tenantId,
      },
      include: {
        projectManager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        siteManager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        phases: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' },
              include: {
                subtasks: {
                  orderBy: { order: 'asc' },
                },
                milestone: true,
                anomalies: true,
              },
            },
          },
        },
        milestones: {
          orderBy: { dueDate: 'asc' },
          include: {
            tasks: {
              select: {
                id: true,
                name: true,
                status: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return null;
    }

    const allTasks = project.phases.flatMap((phase) => phase.tasks);
    const rootTasks = allTasks.filter((task) => task.parentTaskId === null);
    const allAnomalies = allTasks.flatMap((task) => task.anomalies);

    const periodStart = options?.periodStart
      ? new Date(options.periodStart)
      : null;

    const periodEnd = options?.periodEnd ? new Date(options.periodEnd) : null;

    return {
      reportContext: {
        type: 'PROJECT_PROGRESS_REPORT',
        generatedAt: new Date(),
        periodStart,
        periodEnd,
      },

      project: {
        id: project.id,
        name: project.name,
        code: project.code,
        client: project.client,
        address: project.address,
        type: project.type,
        status: project.status,
        description: project.description,
        startDate: project.startDate,
        endDate: project.endDate,
        baselineStartDate: project.baselineStartDate,
        baselineEndDate: project.baselineEndDate,
        durationDays: this.calculateDurationDays(
          project.startDate,
          project.endDate,
        ),
        siteArea: project.siteArea,
        builtArea: project.builtArea,
        floorsCount: project.floorsCount,
        projectManager: project.projectManager,
        siteManager: project.siteManager,
      },

      computed: {
        overallProgress: this.calculateProgress(rootTasks),
        taskStatistics: this.getTaskStatistics(rootTasks),
        anomalyStatistics: this.getAnomalyStatistics(allAnomalies),
        totalPhases: project.phases.length,
        totalMilestones: project.milestones.length,
      },

      phases: project.phases.map((phase) => {
        const phaseRootTasks = phase.tasks.filter(
          (task) => task.parentTaskId === null,
        );

        return {
          id: phase.id,
          name: phase.name,
          description: phase.description,
          status: phase.status,
          order: phase.order,
          startDate: phase.startDate,
          endDate: phase.endDate,
          baselineStartDate: phase.baselineStartDate,
          baselineEndDate: phase.baselineEndDate,
          durationDays: this.calculateDurationDays(
            phase.startDate,
            phase.endDate,
          ),
          progress: this.calculateProgress(phaseRootTasks),
          taskStatistics: this.getTaskStatistics(phaseRootTasks),
          tasks: phaseRootTasks.map((task) => ({
            id: task.id,
            name: task.name,
            description: task.description,
            status: task.status,
            priority: task.priority,
            order: task.order,
            startDate: task.startDate,
            endDate: task.endDate,
            baselineStartDate: task.baselineStartDate,
            baselineEndDate: task.baselineEndDate,
            durationDays: this.calculateDurationDays(
              task.startDate,
              task.endDate,
            ),
            milestone: task.milestone
              ? {
                  id: task.milestone.id,
                  name: task.milestone.name,
                  dueDate: task.milestone.dueDate,
                  status: task.milestone.status,
                }
              : null,
            subtasks: task.subtasks.map((subtask) => ({
              id: subtask.id,
              name: subtask.name,
              description: subtask.description,
              status: subtask.status,
              priority: subtask.priority,
              order: subtask.order,
              startDate: subtask.startDate,
              endDate: subtask.endDate,
              baselineStartDate: subtask.baselineStartDate,
              baselineEndDate: subtask.baselineEndDate,
              durationDays: this.calculateDurationDays(
                subtask.startDate,
                subtask.endDate,
              ),
            })),
            anomalies: task.anomalies.map((anomaly) => ({
              id: anomaly.id,
              title: anomaly.title,
              description: anomaly.description,
              severity: anomaly.severity,
              status: anomaly.status,
              createdAt: anomaly.createdAt,
            })),
          })),
        };
      }),

      milestones: project.milestones.map((milestone) => ({
        id: milestone.id,
        name: milestone.name,
        description: milestone.description,
        dueDate: milestone.dueDate,
        achievedAt: milestone.achievedAt,
        status: milestone.status,
        tasks: milestone.tasks.map((task) => ({
          id: task.id,
          name: task.name,
          status: task.status,
          startDate: task.startDate,
          endDate: task.endDate,
        })),
      })),

      anomalies: allAnomalies.map((anomaly) => ({
        id: anomaly.id,
        title: anomaly.title,
        description: anomaly.description,
        severity: anomaly.severity,
        status: anomaly.status,
        taskId: anomaly.taskId,
        createdAt: anomaly.createdAt,
      })),
    };
  }

  async generateProjectProgressReport(
    projectId: number,
    user: CurrentUser,
    options?: GenerateProgressReportOptions,
  ) {
    if (!user.tenantId) {
      throw new BadRequestException('Utilisateur sans tenant.');
    }

    const projectData = await this.getProjectDataForReport(
      projectId,
      user.tenantId,
      options,
    );

    if (!projectData) {
      throw new NotFoundException('Projet introuvable.');
    }

    const report = (await this.openRouterReportService.generateProgressReport(
      projectData,
    )) as Prisma.InputJsonValue;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.prisma.projectProgressReport.create({
      data: {
        projectId,
        report,
        provider: 'openrouter',
        model:
          process.env.OPENROUTER_REPORT_MODEL ||
          process.env.OPENROUTER_MODEL ||
          'nvidia/nemotron-3-super:free',
        generatedBy: user.id,
        periodStart: options?.periodStart
          ? new Date(options.periodStart)
          : null,
        periodEnd: options?.periodEnd ? new Date(options.periodEnd) : null,
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getLatestReport(projectId: number) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return this.prisma.projectProgressReport.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getReportHistory(projectId: number) {
    return this.prisma.projectProgressReport.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReportById(id: number) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const report = await this.prisma.projectProgressReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('Rapport introuvable.');
    }

    return report;
  }

  async deleteReport(id: number) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const report = await this.prisma.projectProgressReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('Rapport introuvable.');
    }

    return this.prisma.projectProgressReport.delete({
      where: { id },
    });
  }
}
