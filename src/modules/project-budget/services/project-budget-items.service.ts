import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateProjectBudgetItemDto } from '../dto/create-project-budget-item.dto';
import { UpdateProjectBudgetItemDto } from '../dto/update-project-budget-item.dto';
import { ProjectBudgetItemsRepository } from '../repositories/project-budget-items.repository';

@Injectable()
export class ProjectBudgetItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: ProjectBudgetItemsRepository,
  ) {}

  async create(dto: CreateProjectBudgetItemDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }

    let projectBudget = await this.prisma.projectBudget.findUnique({
      where: { projectId: dto.projectId },
    });

    if (!projectBudget) {
      projectBudget = await this.prisma.projectBudget.create({
        data: {
          project: {
            connect: { id: dto.projectId },
          },
          directCostsTotal: 0,
          indirectCostsTotal: 0,
          contingencyRate: 0,
          contingencyUsed: 0,
          totalBudget: 0,
        },
      });
    }

    const item = await this.repository.create({
      category: dto.category,
      label: dto.label,
      amount: dto.amount,
      notes: dto.notes,
      projectBudget: {
        connect: { id: projectBudget.id },
      },
    });

    await this.refreshIndirectTotals(projectBudget.id);

    return item;
  }

  async findAll(filters?: { projectBudgetId?: number; category?: string }) {
    return this.repository.findMany({
      ...(filters?.projectBudgetId
        ? { projectBudgetId: filters.projectBudgetId }
        : {}),
      ...(filters?.category ? { category: filters.category } : {}),
    });
  }

  async findOne(id: number) {
    const item = await this.repository.findUnique(id);

    if (!item) {
      throw new NotFoundException('Coût indirect introuvable');
    }

    return item;
  }

  async update(id: number, dto: UpdateProjectBudgetItemDto) {
    const existing = await this.repository.findUnique(id);

    if (!existing) {
      throw new NotFoundException('Coût indirect introuvable');
    }

    const updated = await this.repository.update(id, {
      ...(dto.category !== undefined ? { category: dto.category } : {}),
      ...(dto.label !== undefined ? { label: dto.label } : {}),
      ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
    });

    await this.refreshIndirectTotals(existing.projectBudgetId);

    return updated;
  }

  async remove(id: number) {
    const existing = await this.repository.findUnique(id);

    if (!existing) {
      throw new NotFoundException('Coût indirect introuvable');
    }

    const deleted = await this.repository.delete(id);

    await this.refreshIndirectTotals(existing.projectBudgetId);

    return deleted;
  }

  private async refreshIndirectTotals(projectBudgetId: number) {
    const items = await this.prisma.budgetIndirectItem.findMany({
      where: { projectBudgetId },
      select: { amount: true },
    });

    const indirectCostsTotal = items.reduce(
      (sum, item) => sum + (item.amount ?? 0),
      0,
    );

    const budget = await this.prisma.projectBudget.findUnique({
      where: { id: projectBudgetId },
      select: {
        directCostsTotal: true,
        contingencyRate: true,
      },
    });

    if (!budget) return;

    const contingencyAmount =
      ((budget.directCostsTotal + indirectCostsTotal) *
        (budget.contingencyRate ?? 0)) /
      100;

    const totalBudget =
      (budget.directCostsTotal ?? 0) + indirectCostsTotal + contingencyAmount;

    await this.prisma.projectBudget.update({
      where: { id: projectBudgetId },
      data: {
        indirectCostsTotal,
        totalBudget,
      },
    });
  }
}
