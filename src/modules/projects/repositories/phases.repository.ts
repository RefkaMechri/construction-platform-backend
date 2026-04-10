import { Injectable } from '@nestjs/common';
import { Phase, Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class PhasesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.PhaseCreateInput): Promise<Phase> {
    return this.prisma.phase.create({ data });
  }

  async findByProject(projectId: number): Promise<Phase[]> {
    return this.prisma.phase.findMany({
      where: { projectId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findById(id: number): Promise<Phase | null> {
    return this.prisma.phase.findUnique({
      where: { id },
    });
  }

  async update(id: number, data: Prisma.PhaseUpdateInput): Promise<Phase> {
    return this.prisma.phase.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<Phase> {
    return this.prisma.phase.delete({
      where: { id },
    });
  }
}
