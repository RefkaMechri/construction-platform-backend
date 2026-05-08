import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectStatus, ProjectType } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { OpenRouterPlanningService } from './ollama-planning.service';

type CurrentUser = {
  id: number;
  tenantId: number | null;
  role: string;
};

@Injectable()
export class PlanningAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openRouterPlanningService: OpenRouterPlanningService,
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

  async getPlanningForAI(projectId: number, tenantId: number) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        tenantId,
      },
      include: {
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
                predecessors: {
                  include: {
                    predecessorTask: {
                      select: {
                        id: true,
                        name: true,
                        startDate: true,
                        endDate: true,
                        status: true,
                      },
                    },
                  },
                },
                successors: {
                  include: {
                    successorTask: {
                      select: {
                        id: true,
                        name: true,
                        startDate: true,
                        endDate: true,
                        status: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        milestones: {
          include: {
            tasks: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!project) return null;

    return {
      id: project.id,
      name: project.name,
      code: project.code,
      client: project.client,
      address: project.address,
      type: project.type,
      status: project.status,
      siteArea: project.siteArea,
      builtArea: project.builtArea,
      floorsCount: project.floorsCount,
      startDate: project.startDate,
      endDate: project.endDate,
      baselineStartDate: project.baselineStartDate,
      baselineEndDate: project.baselineEndDate,
      durationDays: this.calculateDurationDays(
        project.startDate,
        project.endDate,
      ),
      phases: project.phases.map((phase) => ({
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
        tasks: phase.tasks
          .filter((task) => task.parentTaskId === null)
          .map((task) => ({
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
            dependencies: {
              predecessors: task.predecessors.map((dep) => ({
                taskId: dep.predecessorTaskId,
                taskName: dep.predecessorTask.name,
                type: dep.type,
                lagDays: dep.lagDays,
              })),
              successors: task.successors.map((dep) => ({
                taskId: dep.successorTaskId,
                taskName: dep.successorTask.name,
                type: dep.type,
                lagDays: dep.lagDays,
              })),
            },
          })),
      })),
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
          startDate: task.startDate,
          endDate: task.endDate,
          status: task.status,
          durationDays: this.calculateDurationDays(
            task.startDate,
            task.endDate,
          ),
        })),
      })),
    };
  }

  async getHistoricalProjectsForAI(
    currentProjectId: number,
    tenantId: number,
    projectType: ProjectType,
  ) {
    const projects = await this.prisma.project.findMany({
      where: {
        tenantId,
        id: {
          not: currentProjectId,
        },
        status: ProjectStatus.TERMINE,
        type: projectType,
      },
      take: 5,
      orderBy: {
        endDate: 'desc',
      },
      include: {
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
              },
            },
          },
        },
        milestones: {
          include: {
            tasks: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
                status: true,
              },
            },
          },
        },
      },
    });

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      code: project.code,
      type: project.type,
      status: project.status,
      siteArea: project.siteArea,
      builtArea: project.builtArea,
      floorsCount: project.floorsCount,
      startDate: project.startDate,
      endDate: project.endDate,
      durationDays: this.calculateDurationDays(
        project.startDate,
        project.endDate,
      ),
      phases: project.phases.map((phase) => ({
        id: phase.id,
        name: phase.name,
        status: phase.status,
        startDate: phase.startDate,
        endDate: phase.endDate,
        durationDays: this.calculateDurationDays(
          phase.startDate,
          phase.endDate,
        ),
        tasks: phase.tasks
          .filter((task) => task.parentTaskId === null)
          .map((task) => ({
            id: task.id,
            name: task.name,
            status: task.status,
            priority: task.priority,
            startDate: task.startDate,
            endDate: task.endDate,
            durationDays: this.calculateDurationDays(
              task.startDate,
              task.endDate,
            ),
            milestoneName: task.milestone?.name ?? null,
            subtasks: task.subtasks.map((subtask) => ({
              id: subtask.id,
              name: subtask.name,
              status: subtask.status,
              priority: subtask.priority,
              startDate: subtask.startDate,
              endDate: subtask.endDate,
              durationDays: this.calculateDurationDays(
                subtask.startDate,
                subtask.endDate,
              ),
            })),
          })),
      })),
      milestones: project.milestones.map((milestone) => ({
        id: milestone.id,
        name: milestone.name,
        dueDate: milestone.dueDate,
        achievedAt: milestone.achievedAt,
        status: milestone.status,
        tasks: milestone.tasks.map((task) => ({
          id: task.id,
          name: task.name,
          status: task.status,
          durationDays: this.calculateDurationDays(
            task.startDate,
            task.endDate,
          ),
        })),
      })),
    }));
  }

  async getPlanningAnalysisHistoryForAI(projectId: number) {
    const analyses = await this.prisma.planningAIAnalysis.findMany({
      where: {
        projectId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    return analyses.map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      provider: item.provider,
      model: item.model,
      analysis: item.analysis,
    }));
  }

  async analyzeProjectPlanning(projectId: number, user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException('Utilisateur sans tenant.');
    }

    const selectedProject = await this.getPlanningForAI(
      projectId,
      user.tenantId,
    );

    if (!selectedProject) {
      throw new NotFoundException('Projet introuvable.');
    }

    const [historicalProjects, planningAnalysisHistory] = await Promise.all([
      this.getHistoricalProjectsForAI(
        projectId,
        user.tenantId,
        selectedProject.type,
      ),
      this.getPlanningAnalysisHistoryForAI(projectId),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const analysis = (await this.openRouterPlanningService.analyzePlanning({
      selectedProject,
      historicalProjects,
      planningAnalysisHistory,
    })) as Prisma.InputJsonValue;

    return this.prisma.planningAIAnalysis.create({
      data: {
        projectId,
        analysis,
        provider: 'openrouter',
        model: process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-super:free',
      },
    });
  }

  async getLatestAnalysis(projectId: number) {
    return this.prisma.planningAIAnalysis.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAnalysisHistory(projectId: number) {
    return this.prisma.planningAIAnalysis.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
