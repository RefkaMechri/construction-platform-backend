import { Injectable } from '@nestjs/common';
import { Prisma, Milestone } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class MilestonesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.MilestoneCreateInput): Promise<Milestone> {
    return this.prisma.milestone.create({ data });
  }

  findByProject(projectId: number): Promise<Milestone[]> {
    return this.prisma.milestone.findMany({
      where: { projectId },
      orderBy: { dueDate: 'asc' },
    });
  }

  findById(id: number) {
    return this.prisma.milestone.findUnique({ where: { id } });
  }

  update(id: number, data: Prisma.MilestoneUpdateInput) {
    return this.prisma.milestone.update({
      where: { id },
      data,
    });
  }

  delete(id: number) {
    return this.prisma.milestone.delete({
      where: { id },
    });
  }
}
