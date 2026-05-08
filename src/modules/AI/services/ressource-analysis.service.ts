/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectStatus, ProjectType } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { OpenRouterResourceService } from './ollama-resource.service';

@Injectable()
export class ResourceAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: OpenRouterResourceService,
  ) {}

  private chunkArray<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];

    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }

    return chunks;
  }

  private getRiskLevel(risk: number): 'low' | 'medium' | 'high' {
    if (risk <= 30) return 'low';
    if (risk <= 70) return 'medium';
    return 'high';
  }

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

  async getData(projectId: number, tenantId: number) {
    return this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        status: true,
        siteArea: true,
        builtArea: true,
        floorsCount: true,
        phases: {
          select: {
            id: true,
            name: true,
            tasks: {
              select: {
                id: true,
                name: true,
                description: true,
                startDate: true,
                endDate: true,
                status: true,
                priority: true,
                parentTaskId: true,
                assignments: {
                  select: {
                    startDate: true,
                    endDate: true,
                    employee: {
                      select: {
                        id: true,
                        name: true,
                        jobTitle: true,
                        skills: true,
                        availabilityStatus: true,
                      },
                    },
                  },
                },
                assignmentsEq: {
                  select: {
                    startDate: true,
                    endDate: true,
                    equipment: {
                      select: {
                        id: true,
                        name: true,
                        category: true,
                        capacity: true,
                        availabilityStatus: true,
                        condition: true,
                      },
                    },
                  },
                },
                assignmentsMt: {
                  select: {
                    quantity: true,
                    startDate: true,
                    material: {
                      select: {
                        id: true,
                        name: true,
                        category: true,
                        unit: true,
                        quantity: true,
                        reservedQuantity: true,
                        availabilityStatus: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async getHistoricalProjectsForAI(
    currentProjectId: number,
    tenantId: number,
    projectType: ProjectType,
  ) {
    const projects = await this.prisma.project.findMany({
      where: {
        tenantId,
        id: { not: currentProjectId },
        status: ProjectStatus.TERMINE,
        type: projectType,
      },
      take: 5,
      orderBy: {
        endDate: 'desc',
      },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        status: true,
        siteArea: true,
        builtArea: true,
        floorsCount: true,
        startDate: true,
        endDate: true,
        phases: {
          select: {
            id: true,
            name: true,
            tasks: {
              select: {
                id: true,
                name: true,
                description: true,
                startDate: true,
                endDate: true,
                status: true,
                priority: true,
                parentTaskId: true,
                assignments: {
                  select: {
                    employee: {
                      select: {
                        id: true,
                        jobTitle: true,
                        skills: true,
                      },
                    },
                  },
                },
                assignmentsEq: {
                  select: {
                    equipment: {
                      select: {
                        id: true,
                        name: true,
                        category: true,
                        capacity: true,
                      },
                    },
                  },
                },
                assignmentsMt: {
                  select: {
                    quantity: true,
                    material: {
                      select: {
                        id: true,
                        name: true,
                        category: true,
                        unit: true,
                      },
                    },
                  },
                },
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
      durationDays: this.calculateDurationDays(
        project.startDate,
        project.endDate,
      ),
      phases: project.phases.map((phase) => ({
        id: phase.id,
        name: phase.name,
        tasks: phase.tasks
          .filter((task) => task.parentTaskId === null)
          .map((task) => ({
            id: task.id,
            name: task.name,
            description: task.description,
            status: task.status,
            priority: task.priority,
            durationDays: this.calculateDurationDays(
              task.startDate,
              task.endDate,
            ),
            employeesUsed: this.groupEmployeesByProfile(task.assignments),
            equipmentUsed: this.groupEquipmentByName(task.assignmentsEq),
            materialsUsed: this.groupMaterialsByName(task.assignmentsMt),
          })),
      })),
    }));
  }

  async getResourceAnalysisHistoryForAI(projectId: number) {
    const analyses = await this.prisma.resourceAIAnalysis.findMany({
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

  private groupEmployeesByProfile(assignments: any[]) {
    const result = new Map<string, number>();

    for (const assignment of assignments) {
      const profile =
        assignment.employee?.jobTitle ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        assignment.employee?.skills?.join?.(', ') ||
        assignment.employee?.skills ||
        'Profil non défini';

      result.set(profile, (result.get(profile) ?? 0) + 1);
    }

    return Array.from(result.entries()).map(([profile, quantity]) => ({
      profile,
      quantity,
    }));
  }

  private groupEquipmentByName(assignmentsEq: any[]) {
    const result = new Map<string, number>();

    for (const assignment of assignmentsEq) {
      const name =
        assignment.equipment?.name ||
        assignment.equipment?.category ||
        'Équipement non défini';

      result.set(name, (result.get(name) ?? 0) + 1);
    }

    return Array.from(result.entries()).map(([equipmentName, quantity]) => ({
      equipmentName,
      quantity,
    }));
  }

  private groupMaterialsByName(assignmentsMt: any[]) {
    const result = new Map<
      string,
      {
        materialName: string;
        unit: string | null;
        quantity: number;
      }
    >();

    for (const assignment of assignmentsMt) {
      const materialName =
        assignment.material?.name ||
        assignment.material?.category ||
        'Matériau non défini';

      const current = result.get(materialName);

      result.set(materialName, {
        materialName,
        unit: assignment.material?.unit ?? null,
        quantity:
          Number(current?.quantity ?? 0) + Number(assignment.quantity ?? 0),
      });
    }

    return Array.from(result.values());
  }

  private flattenTasks(project: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return project.phases.flatMap((phase: any) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      phase.tasks
        .filter((task: any) => task.parentTaskId === null)
        .map((task: any) => ({
          taskId: task.id,
          taskName: task.name,
          phaseId: phase.id,
          phaseName: phase.name,
          description: task.description,
          startDate: task.startDate,
          endDate: task.endDate,
          durationDays: this.calculateDurationDays(
            task.startDate,
            task.endDate,
          ),
          status: task.status,
          priority: task.priority,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          employeesAssigned: task.assignments.map((a: any) => ({
            employeeId: a.employee.id,
            name: a.employee.name,
            jobTitle: a.employee.jobTitle,
            skills: a.employee.skills,
            availabilityStatus: a.employee.availabilityStatus,
            startDate: a.startDate,
            endDate: a.endDate,
          })),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          equipmentAssigned: task.assignmentsEq.map((a: any) => ({
            equipmentId: a.equipment.id,
            name: a.equipment.name,
            category: a.equipment.category,
            capacity: a.equipment.capacity,
            availabilityStatus: a.equipment.availabilityStatus,
            condition: a.equipment.condition,
            startDate: a.startDate,
            endDate: a.endDate,
          })),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          materialsAssigned: task.assignmentsMt.map((a: any) => ({
            materialId: a.material.id,
            name: a.material.name,
            category: a.material.category,
            assignedQuantity: Number(a.quantity ?? 0),
            unit: a.material.unit,
            stockQuantity: Number(a.material.quantity ?? 0),
            reservedQuantity: Number(a.material.reservedQuantity ?? 0),
            availabilityStatus: a.material.availabilityStatus,
            startDate: a.startDate,
          })),
        })),
    );
  }

  private mergeAnalyses(analyses: any[]) {
    const tasksAnalysis = analyses.flatMap((a) => a.tasksAnalysis ?? []);
    const priorityActions = analyses.flatMap((a) => a.priorityActions ?? []);
    const historicalReferenceUsed = analyses.flatMap(
      (a) => a.historicalReferenceUsed ?? [],
    );

    const globalResourceRiskPercent = tasksAnalysis.length
      ? Math.max(...tasksAnalysis.map((t: any) => t.resourceRiskPercent ?? 0))
      : 0;

    return {
      globalResourceRiskPercent,
      globalRiskLevel: this.getRiskLevel(globalResourceRiskPercent),
      summary: `Analyse des ressources générée sur ${tasksAnalysis.length} tâche(s), avec prise en compte de ${historicalReferenceUsed.length} référence(s) historique(s).`,
      historicalReferenceUsed,
      tasksAnalysis,
      priorityActions,
    } satisfies Prisma.InputJsonObject;
  }

  async analyze(projectId: number, tenantId: number) {
    const project = await this.getData(projectId, tenantId);

    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }

    const [historicalProjects, resourceAnalysisHistory] = await Promise.all([
      this.getHistoricalProjectsForAI(projectId, tenantId, project.type),
      this.getResourceAnalysisHistoryForAI(projectId),
    ]);

    const allTasks = this.flattenTasks(project);

    /**
     * 1 = analyse plus précise tâche par tâche.
     * Tu peux mettre 2 ou 3 si ton modèle supporte bien le contexte.
     */
    const taskChunks = this.chunkArray(allTasks, 1);

    const analyses: any[] = [];

    for (const chunk of taskChunks) {
      const chunkAnalysis = await this.ai.analyzeResources({
        currentProject: {
          id: project.id,
          name: project.name,
          code: project.code,
          type: project.type,
          status: project.status,
          siteArea: project.siteArea,
          builtArea: project.builtArea,
          floorsCount: project.floorsCount,
          tasks: chunk,
        },
        historicalProjects,
        resourceAnalysisHistory,
      });

      analyses.push(chunkAnalysis);
    }

    const finalAnalysis = this.mergeAnalyses(analyses);

    return this.prisma.resourceAIAnalysis.create({
      data: {
        projectId,
        analysis: finalAnalysis,
        provider: 'openrouter',
        model: process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-super:free',
      },
    });
  }

  async latest(projectId: number) {
    return this.prisma.resourceAIAnalysis.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async history(projectId: number) {
    return this.prisma.resourceAIAnalysis.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
