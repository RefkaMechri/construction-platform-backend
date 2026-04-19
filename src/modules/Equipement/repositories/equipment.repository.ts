import { Injectable } from '@nestjs/common';
import { Prisma, Equipment } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class EquipmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.EquipmentCreateInput): Promise<Equipment> {
    return this.prisma.equipment.create({
      data,
      include: {
        tenant: true,
        createdBy: true,
      },
    });
  }

  async findAll(): Promise<Equipment[]> {
    return this.prisma.equipment.findMany({
      include: {
        tenant: true,
        createdBy: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: number): Promise<Equipment | null> {
    return this.prisma.equipment.findUnique({
      where: { id },
      include: {
        tenant: true,
        createdBy: true,
      },
    });
  }

  async update(
    id: number,
    data: Prisma.EquipmentUpdateInput,
  ): Promise<Equipment> {
    return this.prisma.equipment.update({
      where: { id },
      data,
      include: {
        tenant: true,
        createdBy: true,
      },
    });
  }

  async delete(id: number): Promise<Equipment> {
    return this.prisma.equipment.delete({
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
    return this.prisma.equipment.findMany({
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
  async findOne(id: number) {
    return this.prisma.equipment.findUnique({
      where: { id },
    });
  }

  async updateDailyCost(id: number, dailyCost: number) {
    return this.prisma.equipment.update({
      where: { id },
      data: {
        dailyCost,
      },
    });
  }
}
