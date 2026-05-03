/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectStatus } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { OpenRouterPortfolioService } from './openrouter-portfolio.service';

type CurrentUser = {
  id: number;
  tenantId: number | null;
  role: string;
};

@Injectable()
export class PortfolioAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: OpenRouterPortfolioService,
  ) {}

  private readonly activeProjectStatuses: ProjectStatus[] = [
    ProjectStatus.EN_COURS,
    ProjectStatus.EN_PAUSE,
    ProjectStatus.BROUILLON,
  ];

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

  private groupEmployeesByProfile(assignments: any[]) {
    const result = new Map<string, number>();

    for (const assignment of assignments) {
      const profile =
        assignment.employee?.jobTitle ||
        assignment.employee?.skills?.join(', ') ||
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
      const equipmentName =
        assignment.equipment?.name ||
        assignment.equipment?.category ||
        'Équipement non défini';

      result.set(equipmentName, (result.get(equipmentName) ?? 0) + 1);
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

  async getCurrentProjectsForAI(tenantId: number) {
    const projects = await this.prisma.project.findMany({
      where: {
        tenantId,
        status: ProjectStatus.EN_COURS,
      },
      orderBy: {
        endDate: 'asc',
      },
      include: {
        phases: {
          orderBy: {
            order: 'asc',
          },
          include: {
            tasks: {
              orderBy: {
                order: 'asc',
              },
              include: {
                milestone: true,
                assignments: {
                  include: {
                    employee: {
                      select: {
                        id: true,
                        name: true,
                        jobTitle: true,
                        skills: true,
                        availabilityStatus: true,
                        unavailableFrom: true,
                        unavailableTo: true,
                        status: true,
                        dailyCost: true,
                      },
                    },
                  },
                },
                assignmentsEq: {
                  include: {
                    equipment: {
                      select: {
                        id: true,
                        name: true,
                        category: true,
                        capacity: true,
                        availabilityStatus: true,
                        condition: true,
                        status: true,
                        dailyCost: true,
                      },
                    },
                  },
                },
                assignmentsMt: {
                  include: {
                    material: {
                      select: {
                        id: true,
                        name: true,
                        category: true,
                        unit: true,
                        quantity: true,
                        reservedQuantity: true,
                        availabilityStatus: true,
                        status: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        milestones: true,
      },
    });

    return projects.map((project) => ({
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
      milestones: project.milestones.map((milestone) => ({
        id: milestone.id,
        name: milestone.name,
        dueDate: milestone.dueDate,
        achievedAt: milestone.achievedAt,
        status: milestone.status,
      })),
      phases: project.phases.map((phase) => ({
        id: phase.id,
        name: phase.name,
        status: phase.status,
        order: phase.order,
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
            description: task.description,
            status: task.status,
            priority: task.priority,
            startDate: task.startDate,
            endDate: task.endDate,
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
            employeesAssigned: task.assignments.map((assignment) => ({
              assignmentId: assignment.id,
              employeeId: assignment.employee.id,
              employeeName: assignment.employee.name,
              jobTitle: assignment.employee.jobTitle,
              skills: assignment.employee.skills,
              availabilityStatus: assignment.employee.availabilityStatus,
              unavailableFrom: assignment.employee.unavailableFrom,
              unavailableTo: assignment.employee.unavailableTo,
              employeeStatus: assignment.employee.status,
              dailyCost: assignment.employee.dailyCost,
              assignmentStartDate: assignment.startDate,
              assignmentEndDate: assignment.endDate,
            })),
            equipmentAssigned: task.assignmentsEq.map((assignment) => ({
              assignmentId: assignment.id,
              equipmentId: assignment.equipment.id,
              equipmentName: assignment.equipment.name,
              category: assignment.equipment.category,
              capacity: assignment.equipment.capacity,
              availabilityStatus: assignment.equipment.availabilityStatus,
              condition: assignment.equipment.condition,
              equipmentStatus: assignment.equipment.status,
              dailyCost: assignment.equipment.dailyCost,
              assignmentStartDate: assignment.startDate,
              assignmentEndDate: assignment.endDate,
            })),
            materialsAssigned: task.assignmentsMt.map((assignment) => ({
              assignmentId: assignment.id,
              materialId: assignment.material.id,
              materialName: assignment.material.name,
              category: assignment.material.category,
              assignedQuantity: Number(assignment.quantity ?? 0),
              unit: assignment.material.unit,
              stockQuantity: Number(assignment.material.quantity ?? 0),
              reservedQuantity: Number(
                assignment.material.reservedQuantity ?? 0,
              ),
              availabilityStatus: assignment.material.availabilityStatus,
              materialStatus: assignment.material.status,
              assignmentStartDate: assignment.startDate,
            })),
          })),
      })),
    }));
  }

  async getHistoricalProjectsForAI(tenantId: number) {
    const projects = await this.prisma.project.findMany({
      where: {
        tenantId,
        status: ProjectStatus.TERMINE,
      },
      take: 8,
      orderBy: {
        endDate: 'desc',
      },
      include: {
        phases: {
          orderBy: {
            order: 'asc',
          },
          include: {
            tasks: {
              orderBy: {
                order: 'asc',
              },
              include: {
                assignments: {
                  include: {
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
                  include: {
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
                  include: {
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

  async getAvailableEmployeesForAI(tenantId: number) {
    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
      orderBy: {
        jobTitle: 'asc',
      },
      select: {
        id: true,
        name: true,
        jobTitle: true,
        skills: true,
        availabilityStatus: true,
        unavailableFrom: true,
        unavailableTo: true,
        dailyCost: true,
        assignments: {
          select: {
            startDate: true,
            endDate: true,
            task: {
              select: {
                id: true,
                name: true,
                status: true,
                phase: {
                  select: {
                    id: true,
                    name: true,
                    project: {
                      select: {
                        id: true,
                        name: true,
                        status: true,
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

    return employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      jobTitle: employee.jobTitle,
      skills: employee.skills,
      availabilityStatus: employee.availabilityStatus,
      unavailableFrom: employee.unavailableFrom,
      unavailableTo: employee.unavailableTo,
      dailyCost: employee.dailyCost,
      activeAssignments: employee.assignments
        .filter((assignment) =>
          this.activeProjectStatuses.includes(
            assignment.task.phase.project.status,
          ),
        )
        .map((assignment) => ({
          taskId: assignment.task.id,
          taskName: assignment.task.name,
          taskStatus: assignment.task.status,
          phaseId: assignment.task.phase.id,
          phaseName: assignment.task.phase.name,
          projectId: assignment.task.phase.project.id,
          projectName: assignment.task.phase.project.name,
          projectStatus: assignment.task.phase.project.status,
          assignmentStartDate: assignment.startDate,
          assignmentEndDate: assignment.endDate,
        })),
    }));
  }

  async getAvailableEquipmentForAI(tenantId: number) {
    const equipment = await this.prisma.equipment.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
      orderBy: {
        category: 'asc',
      },
      select: {
        id: true,
        name: true,
        code: true,
        category: true,
        capacity: true,
        condition: true,
        availabilityStatus: true,
        unavailableFrom: true,
        unavailableTo: true,
        dailyCost: true,
        assignments: {
          select: {
            startDate: true,
            endDate: true,
            task: {
              select: {
                id: true,
                name: true,
                status: true,
                phase: {
                  select: {
                    id: true,
                    name: true,
                    project: {
                      select: {
                        id: true,
                        name: true,
                        status: true,
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

    return equipment.map((item) => ({
      id: item.id,
      name: item.name,
      code: item.code,
      category: item.category,
      capacity: item.capacity,
      condition: item.condition,
      availabilityStatus: item.availabilityStatus,
      unavailableFrom: item.unavailableFrom,
      unavailableTo: item.unavailableTo,
      dailyCost: item.dailyCost,
      activeAssignments: item.assignments
        .filter((assignment) =>
          this.activeProjectStatuses.includes(
            assignment.task.phase.project.status,
          ),
        )
        .map((assignment) => ({
          taskId: assignment.task.id,
          taskName: assignment.task.name,
          taskStatus: assignment.task.status,
          phaseId: assignment.task.phase.id,
          phaseName: assignment.task.phase.name,
          projectId: assignment.task.phase.project.id,
          projectName: assignment.task.phase.project.name,
          projectStatus: assignment.task.phase.project.status,
          assignmentStartDate: assignment.startDate,
          assignmentEndDate: assignment.endDate,
        })),
    }));
  }

  async analyzePortfolio(user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException('Utilisateur sans tenant.');
    }

    const [
      currentProjects,
      historicalProjects,
      availableEmployees,
      availableEquipment,
    ] = await Promise.all([
      this.getCurrentProjectsForAI(user.tenantId),
      this.getHistoricalProjectsForAI(user.tenantId),
      this.getAvailableEmployeesForAI(user.tenantId),
      this.getAvailableEquipmentForAI(user.tenantId),
    ]);

    const analysis = (await this.ai.analyzePortfolio({
      currentProjects,
      historicalProjects,
      availableEmployees,
      availableEquipment,
      objective:
        'Prioriser les affectations et réaffectations des employés et équipements entre les projets EN_COURS afin de réduire le risque global.',
    })) as Prisma.InputJsonValue;

    const result = {
      generatedAt: new Date().toISOString(),
      currentProjectsCount: currentProjects.length,
      historicalProjectsCount: historicalProjects.length,
      availableEmployeesCount: availableEmployees.length,
      availableEquipmentCount: availableEquipment.length,
      analysis,
    } satisfies Prisma.InputJsonObject;

    return this.prisma.portfolioAIAnalysis.create({
      data: {
        tenantId: user.tenantId,
        analysis: result,
        provider: 'openrouter',
        model: process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-super:free',
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async latest(user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException('Utilisateur sans tenant.');
    }

    return this.prisma.portfolioAIAnalysis.findFirst({
      where: {
        tenantId: user.tenantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async history(user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException('Utilisateur sans tenant.');
    }

    return this.prisma.portfolioAIAnalysis.findMany({
      where: {
        tenantId: user.tenantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number, user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException('Utilisateur sans tenant.');
    }

    const analysis = await this.prisma.portfolioAIAnalysis.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
      },
    });

    if (!analysis) {
      throw new NotFoundException('Analyse portfolio introuvable.');
    }

    return analysis;
  }
}
