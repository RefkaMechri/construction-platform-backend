import { Injectable } from '@nestjs/common';
import { Prisma, TaskDependency } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class TaskDependenciesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.TaskDependencyCreateInput): Promise<TaskDependency> {
    return this.prisma.taskDependency.create({
      data,
      include: {
        predecessorTask: true,
        successorTask: true,
      },
    });
  }

  findByTask(taskId: number): Promise<TaskDependency[]> {
    return this.prisma.taskDependency.findMany({
      where: {
        OR: [{ predecessorTaskId: taskId }, { successorTaskId: taskId }],
      },
      include: {
        predecessorTask: true,
        successorTask: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  findById(id: number): Promise<TaskDependency | null> {
    return this.prisma.taskDependency.findUnique({
      where: { id },
      include: {
        predecessorTask: true,
        successorTask: true,
      },
    });
  }

  delete(id: number): Promise<TaskDependency> {
    return this.prisma.taskDependency.delete({
      where: { id },
    });
  }
}
