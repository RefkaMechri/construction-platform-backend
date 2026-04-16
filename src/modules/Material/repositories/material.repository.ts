import { Injectable } from '@nestjs/common';
import { Prisma, Material } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class MaterialRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.MaterialCreateInput): Promise<Material> {
    return this.prisma.material.create({
      data,
      include: {
        tenant: true,
        createdBy: true,
      },
    });
  }

  async findAll(): Promise<Material[]> {
    return this.prisma.material.findMany({
      include: {
        tenant: true,
        createdBy: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: number): Promise<Material | null> {
    return this.prisma.material.findUnique({
      where: { id },
      include: {
        tenant: true,
        createdBy: true,
      },
    });
  }

  async update(
    id: number,
    data: Prisma.MaterialUpdateInput,
  ): Promise<Material> {
    return this.prisma.material.update({
      where: { id },
      data,
      include: {
        tenant: true,
        createdBy: true,
      },
    });
  }

  async delete(id: number): Promise<Material> {
    return this.prisma.material.delete({
      where: { id },
      include: {
        tenant: true,
        createdBy: true,
      },
    });
  }
  async findAllByTenantWithAssignmentsForProject(
    tenantId: number,
    projectId: number,
  ) {
    return this.prisma.material.findMany({
      where: {
        tenantId,
      },
      include: {
        assignments: {
          where: {
            task: {
              phase: {
                projectId,
              },
            },
          },
          include: {
            task: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
