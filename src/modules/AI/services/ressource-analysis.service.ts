/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { OllamaResourceService } from './ollama-resource.service';

@Injectable()
export class ResourceAnalysisService {
  constructor(
    private prisma: PrismaService,
    private ai: OllamaResourceService,
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

  async getData(projectId: number, tenantId: number) {
    return this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
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

  private flattenTasks(project: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return project.phases.flatMap((phase: any) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      phase.tasks.map((task: any) => ({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        taskId: task.id,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        taskName: task.name,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        phaseId: phase.id,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        phaseName: phase.name,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        description: task.description,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        startDate: task.startDate,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        endDate: task.endDate,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        status: task.status,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        priority: task.priority,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        employeesAssigned: task.assignments.map((a: any) => ({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          employeeId: a.employee.id,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          name: a.employee.name,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          jobTitle: a.employee.jobTitle,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          skills: a.employee.skills,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          availabilityStatus: a.employee.availabilityStatus,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          startDate: a.startDate,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          endDate: a.endDate,
        })),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        equipmentAssigned: task.assignmentsEq.map((a: any) => ({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          equipmentId: a.equipment.id,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          name: a.equipment.name,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          category: a.equipment.category,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          capacity: a.equipment.capacity,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          availabilityStatus: a.equipment.availabilityStatus,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          condition: a.equipment.condition,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          startDate: a.startDate,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          endDate: a.endDate,
        })),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        materialsAssigned: task.assignmentsMt.map((a: any) => ({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          materialId: a.material.id,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          name: a.material.name,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          category: a.material.category,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          assignedQuantity: a.quantity,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          unit: a.material.unit,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          stockQuantity: a.material.quantity,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          reservedQuantity: a.material.reservedQuantity,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          availabilityStatus: a.material.availabilityStatus,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          startDate: a.startDate,
        })),
      })),
    );
  }

  private mergeAnalyses(analyses: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    const tasksAnalysis = analyses.flatMap((a) => a.tasksAnalysis ?? []);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    const priorityActions = analyses.flatMap((a) => a.priorityActions ?? []);

    const globalResourceRiskPercent = tasksAnalysis.length
      ? Math.max(...tasksAnalysis.map((t: any) => t.resourceRiskPercent ?? 0))
      : 0;

    return {
      globalResourceRiskPercent,
      globalRiskLevel: this.getRiskLevel(globalResourceRiskPercent),
      summary: `Analyse des ressources générée sur ${tasksAnalysis.length} tâche(s).`,
      tasksAnalysis,
      priorityActions,
    };
  }

  async analyze(projectId: number, tenantId: number) {
    const project = await this.getData(projectId, tenantId);

    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }

    const allTasks = this.flattenTasks(project);
    const taskChunks = this.chunkArray(allTasks, 1);

    const analyses: any[] = [];

    for (const chunk of taskChunks) {
      const chunkAnalysis = await this.ai.analyzeResources({
        project: {
          id: project.id,
          name: project.name,
          type: project.type,
          status: project.status,
        },
        tasks: chunk,
      });

      analyses.push(chunkAnalysis);
    }

    const finalAnalysis = this.mergeAnalyses(analyses);

    return this.prisma.resourceAIAnalysis.create({
      data: {
        projectId,
        analysis: finalAnalysis,
        provider: 'ollama',
        model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
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
