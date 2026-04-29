import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { OllamaBudgetService } from './ollama-budget.service';

type CurrentUser = {
  id: number;
  tenantId: number | null;
  role: string;
};

@Injectable()
export class BudgetAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ollamaBudgetService: OllamaBudgetService,
  ) {}

  async getBudgetForAI(
    projectId: number,
    tenantId: number,
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  ): Promise<any | null> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        tenantId,
      },
      include: {
        budgetDetails: {
          include: {
            items: {
              orderBy: {
                category: 'asc',
              },
            },
          },
        },
      },
    });

    if (!project || !project.budgetDetails) return null;

    const directCostsTotal = Number(project.budgetDetails.directCostsTotal);
    const indirectCostsTotal = Number(project.budgetDetails.indirectCostsTotal);
    const contingencyRate = Number(project.budgetDetails.contingencyRate);
    const contingencyUsed = Number(project.budgetDetails.contingencyUsed);
    const totalBudget = Number(project.budgetDetails.totalBudget);
    const projectDeclaredBudget = totalBudget;

    const contingencyAmount =
      ((directCostsTotal + indirectCostsTotal) * contingencyRate) / 100;

    const remainingContingency = contingencyAmount - contingencyUsed;

    return {
      project: {
        id: project.id,
        name: project.name,
        code: project.code,
        client: project.client,
        type: project.type,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
      },
      budget: {
        id: project.budgetDetails.id,
        directCostsTotal,
        indirectCostsTotal,
        contingencyRate,
        contingencyUsed,
        contingencyAmount,
        remainingContingency,
        totalBudget,
        notes: project.budgetDetails.notes,
        calculatedBudgetWithoutContingency:
          directCostsTotal + indirectCostsTotal,
        calculatedBudgetWithContingency:
          directCostsTotal + indirectCostsTotal + contingencyAmount,
        gapWithProjectDeclaredBudget: projectDeclaredBudget - totalBudget,
        indirectItems: project.budgetDetails.items.map((item) => ({
          id: item.id,
          category: item.category,
          label: item.label,
          amount: Number(item.amount),
          notes: item.notes,
        })),
      },
    };
  }

  async analyzeProjectBudget(projectId: number, user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException('Utilisateur sans tenant.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const budget = await this.getBudgetForAI(projectId, user.tenantId);

    if (!budget) {
      throw new NotFoundException('Budget du projet introuvable.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const analysis = await this.ollamaBudgetService.analyzeBudget(budget);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.prisma.budgetAIAnalysis.create({
      data: {
        projectId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        analysis,
        provider: 'ollama',
        model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getLatestAnalysis(projectId: number) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.prisma.budgetAIAnalysis.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getAnalysisHistory(projectId: number) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.prisma.budgetAIAnalysis.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
