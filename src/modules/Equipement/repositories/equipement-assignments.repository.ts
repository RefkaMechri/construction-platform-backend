/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import { EquipmentAssignment, Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class EquipmentAssignmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.EquipmentAssignmentCreateInput,
  ): Promise<EquipmentAssignment> {
    return this.prisma.equipmentAssignment.create({
      data,
      include: {
        equipment: true,
        task: true,
      },
    });
  }

  async findAll(): Promise<EquipmentAssignment[]> {
    return this.prisma.equipmentAssignment.findMany({
      include: {
        equipment: true,
        task: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: number): Promise<EquipmentAssignment | null> {
    return this.prisma.equipmentAssignment.findUnique({
      where: { id },
      include: {
        equipment: true,
        task: true,
      },
    });
  }

  async findByTaskId(taskId: number): Promise<EquipmentAssignment[]> {
    return this.prisma.equipmentAssignment.findMany({
      where: { taskId },
      include: {
        equipment: true,
        task: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  async findByEquipmentId(equipmentId: number): Promise<EquipmentAssignment[]> {
    return this.prisma.equipmentAssignment.findMany({
      where: { equipmentId },
      include: {
        equipment: true,
        task: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    });
  }

  async findConflict(
    equipmentId: number,
    startDate: Date,
    endDate: Date,
    excludeId?: number,
  ): Promise<EquipmentAssignment | null> {
    return this.prisma.equipmentAssignment.findFirst({
      where: {
        equipmentId,
        ...(excludeId !== undefined && {
          id: {
            not: excludeId,
          },
        }),
        startDate: {
          lt: endDate,
        },
        endDate: {
          gt: startDate,
        },
      },
      include: {
        equipment: true,
        task: true,
      },
    });
  }

  async update(
    id: number,
    data: Prisma.EquipmentAssignmentUpdateInput,
  ): Promise<EquipmentAssignment> {
    return this.prisma.equipmentAssignment.update({
      where: { id },
      data,
      include: {
        equipment: true,
        task: true,
      },
    });
  }

  async delete(id: number): Promise<EquipmentAssignment> {
    return this.prisma.equipmentAssignment.delete({
      where: { id },
      include: {
        equipment: true,
        task: true,
      },
    });
  }

  async findAssignmentsByEquipmentId(equipmentId: number) {
    return this.prisma.equipmentAssignment.findMany({
      where: { equipmentId },
      include: {
        task: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }
}
