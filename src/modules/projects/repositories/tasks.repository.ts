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
}
