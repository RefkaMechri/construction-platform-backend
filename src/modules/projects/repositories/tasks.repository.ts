/* eslint-disable @typescript-eslint/require-await */
import { Injectable } from '@nestjs/common';
import { Prisma, Task } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.TaskCreateInput): Promise<Task> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    return this.prisma.task.create({ data });
  }

  async findByPhase(phaseId: number): Promise<Task[]> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.prisma.task.findMany({
      where: { phaseId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  async findById(id: number): Promise<Task | null> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.prisma.task.findUnique({
      where: { id },
    });
  }

  async update(id: number, data: Prisma.TaskUpdateInput): Promise<Task> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.prisma.task.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data,
    });
  }

  async delete(id: number): Promise<Task> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.prisma.task.delete({
      where: { id },
    });
  }
}
