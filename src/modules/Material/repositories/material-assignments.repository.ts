/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import { MaterialAssignment, Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class MaterialAssignmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.MaterialAssignmentCreateInput,
  ): Promise<MaterialAssignment> {
    return this.prisma.materialAssignment.create({
      data,
      include: {
        material: true,
        task: true,
      },
    });
  }

  async findAll(): Promise<MaterialAssignment[]> {
    return this.prisma.materialAssignment.findMany({
      include: {
        material: true,
        task: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: number): Promise<MaterialAssignment | null> {
    return this.prisma.materialAssignment.findUnique({
      where: { id },
      include: {
        material: true,
        task: true,
      },
    });
  }

  async findByTaskId(taskId: number): Promise<MaterialAssignment[]> {
    return this.prisma.materialAssignment.findMany({
      where: { taskId },
      include: {
        material: true,
        task: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByMaterialId(materialId: number): Promise<MaterialAssignment[]> {
    return this.prisma.materialAssignment.findMany({
      where: { materialId },
      include: {
        material: true,
        task: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(
    id: number,
    data: Prisma.MaterialAssignmentUpdateInput,
  ): Promise<MaterialAssignment> {
    return this.prisma.materialAssignment.update({
      where: { id },
      data,
      include: {
        material: true,
        task: true,
      },
    });
  }

  async delete(id: number): Promise<MaterialAssignment> {
    return this.prisma.materialAssignment.delete({
      where: { id },
      include: {
        material: true,
        task: true,
      },
    });
  }

  async findAssignmentsByMaterialId(materialId: number) {
    return this.prisma.materialAssignment.findMany({
      where: { materialId },
      include: {
        task: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  async findMaterialAssignmentInAssignedProjectTask(
    projectId: number,
    taskId: number,
    assignmentId: number,
    siteManagerId: number,
  ) {
    return this.prisma.materialAssignment.findFirst({
      where: {
        id: assignmentId,
        taskId,
        task: {
          phase: {
            project: {
              id: projectId,
              siteManagerId,
            },
          },
        },
      },
      select: {
        id: true,
        quantity: true,
        usedQuantity: true,
        status: true,
        taskId: true,
        materialId: true,
        material: {
          select: {
            id: true,
            name: true,
            unit: true,
          },
        },
      },
    });
  }
  async updateMaterialAssignmentUsage(
    assignmentId: number,
    usedQuantity: number,
    status: string,
  ) {
    return this.prisma.materialAssignment.update({
      where: {
        id: assignmentId,
      },
      data: {
        usedQuantity,
        status,
      },
      select: {
        id: true,
        quantity: true,
        usedQuantity: true,
        status: true,
        notes: true,
        startDate: true,
        createdAt: true,
        updatedAt: true,
        materialId: true,
        taskId: true,
        material: {
          select: {
            id: true,
            name: true,
            code: true,
            category: true,
            brand: true,
            unit: true,
            unitPrice: true,
          },
        },
      },
    });
  }
}
