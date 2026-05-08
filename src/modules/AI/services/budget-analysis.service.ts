import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectStatus, ProjectType } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { OpenRouterBudgetService } from './ollama-budget.service';

type CurrentUser = {
  id: number;
  tenantId: number | null;
  role: string;
};

@Injectable()
export class BudgetAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openRouterBudgetService: OpenRouterBudgetService,
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
        siteArea: project.siteArea,
        builtArea: project.builtArea,
        floorsCount: project.floorsCount,
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

  async getHistoricalBudgetsForAI(
    currentProjectId: number,
    tenantId: number,
    projectType: ProjectType,
  ) {
    const projects = await this.prisma.project.findMany({
      where: {
        tenantId,
        id: {
          not: currentProjectId,
        },
        status: ProjectStatus.TERMINE,
        type: projectType,
        budgetDetails: {
          isNot: null,
        },
      },
      take: 5,
      orderBy: {
        endDate: 'desc',
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

    return projects
      .filter((project) => project.budgetDetails)
      .map((project) => {
        const directCostsTotal = Number(
          project.budgetDetails?.directCostsTotal ?? 0,
        );
        const indirectCostsTotal = Number(
          project.budgetDetails?.indirectCostsTotal ?? 0,
        );
        const contingencyRate = Number(
          project.budgetDetails?.contingencyRate ?? 0,
        );
        const contingencyUsed = Number(
          project.budgetDetails?.contingencyUsed ?? 0,
        );
        const totalBudget = Number(project.budgetDetails?.totalBudget ?? 0);

        const contingencyAmount =
          ((directCostsTotal + indirectCostsTotal) * contingencyRate) / 100;

        return {
          project: {
            id: project.id,
            name: project.name,
            code: project.code,
            type: project.type,
            status: project.status,
            siteArea: project.siteArea,
            builtArea: project.builtArea,
            floorsCount: project.floorsCount,
            startDate: project.startDate,
            endDate: project.endDate,
          },
          budget: {
            id: project.budgetDetails?.id,
            directCostsTotal,
            indirectCostsTotal,
            contingencyRate,
            contingencyAmount,
            contingencyUsed,
            remainingContingency: contingencyAmount - contingencyUsed,
            totalBudget,
            calculatedBudgetWithoutContingency:
              directCostsTotal + indirectCostsTotal,
            calculatedBudgetWithContingency:
              directCostsTotal + indirectCostsTotal + contingencyAmount,
            indirectItems: project.budgetDetails?.items.map((item) => ({
              id: item.id,
              category: item.category,
              label: item.label,
              amount: Number(item.amount),
              notes: item.notes,
            })),
          },
        };
      });
  }

  async getBudgetAnalysisHistoryForAI(projectId: number) {
    const analyses = await this.prisma.budgetAIAnalysis.findMany({
      where: {
        projectId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    return analyses.map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      provider: item.provider,
      model: item.model,
      analysis: item.analysis,
    }));
  }

  async analyzeProjectBudget(projectId: number, user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException('Utilisateur sans tenant.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const budgetData = await this.getBudgetForAI(projectId, user.tenantId);

    if (!budgetData) {
      throw new NotFoundException('Budget du projet introuvable.');
    }

    const [historicalBudgets, budgetAnalysisHistory] = await Promise.all([
      this.getHistoricalBudgetsForAI(
        projectId,
        user.tenantId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        budgetData.project.type,
      ),
      this.getBudgetAnalysisHistoryForAI(projectId),
    ]);

    const analysis = (await this.openRouterBudgetService.analyzeBudget({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      budgetData,
      historicalBudgets,
      budgetAnalysisHistory,
    })) as Prisma.InputJsonValue;

    return this.prisma.budgetAIAnalysis.create({
      data: {
        projectId,
        analysis,
        provider: 'openrouter',
        model: process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-super:free',
      },
    });
  }

  async getLatestAnalysis(projectId: number) {
    return this.prisma.budgetAIAnalysis.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAnalysisHistory(projectId: number) {
    return this.prisma.budgetAIAnalysis.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
