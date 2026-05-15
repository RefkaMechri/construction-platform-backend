/* eslint-disable @typescript-eslint/require-await */
import { Injectable } from '@nestjs/common';
import { Prisma, Task } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.TaskCreateInput): Promise<Task> {
    return this.prisma.task.create({ data });
  }
  async findByProject(projectId: number) {
    return this.prisma.task.findMany({
      where: {
        phase: {
          projectId,
        },
        parentTaskId: null,
      },
      include: {
        phase: true,
        subtasks: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [
        { phase: { order: 'asc' } },
        { order: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  async findByPhase(phaseId: number) {
    return this.prisma.task.findMany({
      where: {
        phaseId,
        parentTaskId: null,
      },
      include: {
        subtasks: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findById(id: number) {
    return this.prisma.task.findUnique({
      where: { id },
      include: {
        parentTask: true,
        subtasks: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
  }

  async update(id: number, data: Prisma.TaskUpdateInput): Promise<Task> {
    return this.prisma.task.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<Task> {
    return this.prisma.task.delete({
      where: { id },
    });
  }
  async findAssignedProjectTaskDetails(
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

        phase: {
          select: {
            id: true,
            name: true,
            status: true,
            project: {
              select: {
                id: true,
                name: true,
                code: true,
                siteManagerId: true,
              },
            },
          },
        },

        milestone: {
          select: {
            id: true,
            name: true,
            dueDate: true,
            status: true,
          },
        },

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
          orderBy: [{ order: 'asc' }, { startDate: 'asc' }, { id: 'asc' }],
        },

        assignmentsMt: {
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
                description: true,
                category: true,
                brand: true,
                quantity: true,
                reservedQuantity: true,
                unit: true,
                quality: true,
                status: true,
                availabilityStatus: true,
                unitPrice: true,
              },
            },
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
    });
  }
}
