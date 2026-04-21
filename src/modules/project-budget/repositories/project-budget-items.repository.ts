import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProjectBudgetItemsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.BudgetIndirectItemCreateInput) {
    return this.prisma.budgetIndirectItem.create({
      data,
    });
  }

  findMany(where?: Prisma.BudgetIndirectItemWhereInput) {
    return this.prisma.budgetIndirectItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  findUnique(id: number) {
    return this.prisma.budgetIndirectItem.findUnique({
      where: { id },
    });
  }

  update(id: number, data: Prisma.BudgetIndirectItemUpdateInput) {
    return this.prisma.budgetIndirectItem.update({
      where: { id },
      data,
    });
  }

  delete(id: number) {
    return this.prisma.budgetIndirectItem.delete({
      where: { id },
    });
  }
}
