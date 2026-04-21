import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma, Project } from '@prisma/client';

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ProjectCreateInput): Promise<Project> {
    return this.prisma.project.create({ data });
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
      },
    });

    return projects.map((project) => ({
      ...project,
      projectManager: project.projectManager?.name ?? '',
      totalBudget: project.budgetDetails?.totalBudget ?? 0,
    })) as Project[];
  }

  async findById(id: number): Promise<Project | null> {
    return this.prisma.project.findUnique({
      where: { id },
    });
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
    return this.prisma.project.update({
      where: { id },
      data,
    });
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
}
