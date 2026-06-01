import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma, Project } from '@prisma/client';

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ProjectCreateInput): Promise<Project> {
    const project = await this.prisma.project.create({
      data,
      include: {
        budgetDetails: {
          select: {
            totalBudget: true,
          },
        },
        projectManager: {
          select: {
            name: true,
          },
        },
        siteManager: {
          select: {
            name: true,
          },
        },
      },
    });

    return {
      ...project,
      projectManager: project.projectManager?.name ?? '',
      siteManager: project.siteManager?.name ?? '',
      totalBudget: project.budgetDetails?.totalBudget ?? 0,
    } as Project;
  }

  async findAllByTenant(tenantId: number): Promise<Project[]> {
    const projects = await this.prisma.project.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        budgetDetails: {
          select: {
            totalBudget: true,
          },
        },
        projectManager: {
          select: {
            name: true,
          },
        },
        siteManager: {
          select: {
            name: true,
          },
        },
      },
    });

    return projects.map((project) => ({
      ...project,
      projectManager: project.projectManager?.name ?? '',
      siteManager: project.siteManager?.name ?? '',
      totalBudget: project.budgetDetails?.totalBudget ?? 0,
    })) as Project[];
  }

  async findById(id: number): Promise<Project | null> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        budgetDetails: {
          select: {
            totalBudget: true,
          },
        },
        projectManager: {
          select: {
            name: true,
          },
        },
        siteManager: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!project) return null;

    return {
      ...project,
      projectManager: project.projectManager?.name ?? '',
      siteManager: project.siteManager?.name ?? '',
      totalBudget: project.budgetDetails?.totalBudget ?? 0,
    } as Project;
  }

  async findByIdAndTenant(id: number, tenantId: number) {
    return this.prisma.project.findFirst({
      where: { id, tenantId },
      include: {
        projectManager: {
          select: {
            id: true,
            name: true,
          },
        },
        siteManager: {
          select: {
            id: true,
            name: true,
          },
        },
        budgetDetails: {
          select: {
            totalBudget: true,
          },
        },
      },
    });
  }

  async countByTenant(tenantId: number): Promise<number> {
    return this.prisma.project.count({
      where: { tenantId },
    });
  }

  async update(id: number, data: Prisma.ProjectUpdateInput): Promise<Project> {
    const project = await this.prisma.project.update({
      where: { id },
      data,
      include: {
        budgetDetails: {
          select: {
            totalBudget: true,
          },
        },
        projectManager: {
          select: {
            name: true,
          },
        },
        siteManager: {
          select: {
            name: true,
          },
        },
      },
    });

    return {
      ...project,
      projectManager: project.projectManager?.name ?? '',
      siteManager: project.siteManager?.name ?? '',
      totalBudget: project.budgetDetails?.totalBudget ?? 0,
    } as Project;
  }

  async delete(id: number): Promise<Project> {
    return this.prisma.project.delete({
      where: { id },
    });
  }

  async findByIdWithPhases(projectId: number) {
    return this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        phases: true,
      },
    });
  }
  /**site manager */
  async findAssignedProjects(siteManagerId: number) {
    return this.prisma.project.findMany({
      where: {
        siteManagerId,
        status: 'EN_COURS',
      },
      select: {
        id: true,
        name: true,
        code: true,
        client: true,
        address: true,
        startDate: true,
        endDate: true,
        budget: true,
        description: true,
        status: true,
        type: true,
        siteArea: true,
        builtArea: true,
        floorsCount: true,
        createdAt: true,
        updatedAt: true,

        projectManager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });
  }

  async findAssignedProjectById(siteManagerId: number, projectId: number) {
    return this.prisma.project.findFirst({
      where: {
        id: projectId,
        siteManagerId,
      },
      select: {
        id: true,
        name: true,
        code: true,
        client: true,
        address: true,
        startDate: true,
        endDate: true,
        baselineStartDate: true,
        baselineEndDate: true,
        budget: true,
        description: true,
        status: true,
        type: true,
        siteArea: true,
        builtArea: true,
        floorsCount: true,
        createdAt: true,
        updatedAt: true,

        projectManager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        tenant: {
          select: {
            id: true,
            name: true,
          },
        },

        phases: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            status: true,
          },
          orderBy: {
            startDate: 'asc',
          },
        },

        milestones: {
          select: {
            id: true,
            name: true,
            dueDate: true,
            status: true,
          },
          orderBy: {
            dueDate: 'asc',
          },
        },
      },
    });
  }
  async findAssignedProjectDetails(projectId: number, siteManagerId: number) {
    return this.prisma.project.findFirst({
      where: {
        id: projectId,
        siteManagerId,
        status: 'EN_COURS',
      },
      select: {
        id: true,
        name: true,
        code: true,
        client: true,
        address: true,
        startDate: true,
        endDate: true,
        baselineStartDate: true,
        baselineEndDate: true,
        budget: true,
        description: true,
        status: true,
        type: true,
        siteArea: true,
        builtArea: true,
        floorsCount: true,
        createdAt: true,
        updatedAt: true,

        projectManager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        tenant: {
          select: {
            id: true,
            name: true,
          },
        },

        phases: {
          select: {
            id: true,
            name: true,
            description: true,
            startDate: true,
            endDate: true,
            baselineStartDate: true,
            baselineEndDate: true,
            status: true,
            order: true,
            createdAt: true,
            updatedAt: true,

            tasks: {
              where: {
                parentTaskId: null,
              },
              select: {
                id: true,
                name: true,
                description: true,
                startDate: true,
                endDate: true,
                baselineStartDate: true,
                baselineEndDate: true,
                status: true,
                priority: true,
                order: true,
                phaseId: true,
                parentTaskId: true,
                milestoneId: true,
                createdAt: true,
                updatedAt: true,

                subtasks: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    startDate: true,
                    endDate: true,
                    baselineStartDate: true,
                    baselineEndDate: true,
                    status: true,
                    priority: true,
                    order: true,
                    phaseId: true,
                    parentTaskId: true,
                    milestoneId: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                  orderBy: [
                    { order: 'asc' },
                    { startDate: 'asc' },
                    { id: 'asc' },
                  ],
                },
              },
              orderBy: [{ order: 'asc' }, { startDate: 'asc' }, { id: 'asc' }],
            },
          },
          orderBy: [{ order: 'asc' }, { startDate: 'asc' }, { id: 'asc' }],
        },
      },
    });
  }
  async findTaskInAssignedProject(
    projectId: number,
    taskId: number,
    siteManagerId: number,
  ) {
    return this.prisma.task.findFirst({
      where: {
        id: taskId,
        phase: {
          project: {
            id: projectId,
            siteManagerId,
          },
        },
      },
      select: {
        id: true,
        status: true,
        phaseId: true,
        phase: {
          select: {
            id: true,
            projectId: true,
          },
        },
      },
    });
  }
  async updateTaskStatus(taskId: number, status: any) {
    return this.prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        status,
      },
      select: {
        id: true,
        name: true,
        description: true,
        startDate: true,
        endDate: true,
        baselineStartDate: true,
        baselineEndDate: true,
        status: true,
        priority: true,
        order: true,
        phaseId: true,
        parentTaskId: true,
        milestoneId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
  findProjectTracking(projectId: number) {
    return this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        startDate: true,
        endDate: true,

        phases: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            name: true,
            status: true,
            order: true,

            tasks: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                name: true,
                description: true,
                status: true,
                priority: true,
                startDate: true,
                endDate: true,
                order: true,
                updatedAt: true,
                subtasks: {
                  orderBy: {
                    order: 'asc',
                  },
                  select: {
                    id: true,
                    name: true,
                    status: true,
                    priority: true,
                    startDate: true,
                    endDate: true,
                    order: true,
                    updatedAt: true,
                    anomalies: {
                      orderBy: {
                        createdAt: 'desc',
                      },
                      select: {
                        id: true,
                        title: true,
                        description: true,
                        severity: true,
                        status: true,
                        photoUrls: true,
                        createdAt: true,
                        updatedAt: true,
                      },
                    },
                  },
                },
                anomalies: {
                  orderBy: { createdAt: 'desc' },
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    severity: true,
                    status: true,
                    photoUrls: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }
  findTenantById(id: number) {
    return this.prisma.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        plan: true,
      },
    });
  }

  findSubscriptionPlanByName(name: string) {
    return this.prisma.subscriptionPlan.findUnique({
      where: { name },
    });
  }
}
