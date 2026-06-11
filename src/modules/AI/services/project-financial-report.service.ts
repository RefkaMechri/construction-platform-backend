/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { OpenRouterProjectFinancialReportService } from './openrouter-project-financial-report.service';

type CurrentUser = {
  id: number;
  tenantId: number | null;
  role: string;
};

type GenerateFinancialReportOptions = {
  periodStart?: string;
  periodEnd?: string;
};

@Injectable()
export class ProjectFinancialReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openRouterFinancialReportService: OpenRouterProjectFinancialReportService,
  ) {}

  private calculateInclusiveDays(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    return (
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
  }

  private getFinancialStatus(consumptionRate: number, variance: number) {
    if (variance > 0 || consumptionRate > 100) return 'critical';
    if (consumptionRate >= 80) return 'warning';
    return 'healthy';
  }

  async getProjectFinancialDataForReport(
    projectId: number,
    tenantId: number,
    options?: GenerateFinancialReportOptions,
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        tenantId,
      },
      include: {
        budgetDetails: {
          include: {
            items: true,
          },
        },
        phases: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' },
              include: {
                assignments: {
                  include: {
                    employee: true,
                  },
                },
                assignmentsEq: {
                  include: {
                    equipment: true,
                  },
                },
                assignmentsMt: {
                  include: {
                    material: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!project) {
      return null;
    }

    let plannedLabor = 0;
    let actualLabor = 0;

    let plannedEquipment = 0;
    let actualEquipment = 0;

    let plannedMaterial = 0;
    let actualMaterial = 0;

    const phases = project.phases.map((phase) => {
      let phasePlannedLabor = 0;
      let phaseActualLabor = 0;

      let phasePlannedEquipment = 0;
      let phaseActualEquipment = 0;

      let phasePlannedMaterial = 0;
      let phaseActualMaterial = 0;

      for (const task of phase.tasks) {
        const consumePlanned =
          task.status === 'IN_PROGRESS' || task.status === 'DONE';

        for (const assignment of task.assignments) {
          const days = this.calculateInclusiveDays(
            assignment.startDate,
            assignment.endDate,
          );

          const cost = days * (assignment.employee.dailyCost ?? 0);

          plannedLabor += cost;
          phasePlannedLabor += cost;

          if (consumePlanned) {
            actualLabor += cost;
            phaseActualLabor += cost;
          }
        }

        for (const assignment of task.assignmentsEq) {
          const days = this.calculateInclusiveDays(
            assignment.startDate,
            assignment.endDate,
          );

          const cost = days * (assignment.equipment.dailyCost ?? 0);

          plannedEquipment += cost;
          phasePlannedEquipment += cost;

          if (consumePlanned) {
            actualEquipment += cost;
            phaseActualEquipment += cost;
          }
        }

        for (const assignment of task.assignmentsMt) {
          const unitPrice = assignment.material.unitPrice ?? 0;

          const planned = assignment.quantity * unitPrice;
          const actual = assignment.usedQuantity * unitPrice;

          plannedMaterial += planned;
          actualMaterial += actual;

          phasePlannedMaterial += planned;
          phaseActualMaterial += actual;
        }
      }

      const phasePlannedTotal =
        phasePlannedLabor + phasePlannedEquipment + phasePlannedMaterial;

      const phaseActualTotal =
        phaseActualLabor + phaseActualEquipment + phaseActualMaterial;

      return {
        phaseId: phase.id,
        phaseName: phase.name,
        status: phase.status,
        planned: {
          labor: phasePlannedLabor,
          equipment: phasePlannedEquipment,
          material: phasePlannedMaterial,
          total: phasePlannedTotal,
        },
        actual: {
          labor: phaseActualLabor,
          equipment: phaseActualEquipment,
          material: phaseActualMaterial,
          total: phaseActualTotal,
        },
        variance: {
          labor: phaseActualLabor - phasePlannedLabor,
          equipment: phaseActualEquipment - phasePlannedEquipment,
          material: phaseActualMaterial - phasePlannedMaterial,
          total: phaseActualTotal - phasePlannedTotal,
        },
        consumptionRate:
          phasePlannedTotal > 0
            ? Math.round((phaseActualTotal / phasePlannedTotal) * 100)
            : 0,
      };
    });

    const plannedDirectCosts =
      plannedLabor + plannedEquipment + plannedMaterial;

    const actualDirectCosts = actualLabor + actualEquipment + actualMaterial;

    const indirectCosts =
      project.budgetDetails?.items.reduce(
        (sum, item) => sum + (item.amount ?? 0),
        0,
      ) ?? 0;

    const contingencyRate = project.budgetDetails?.contingencyRate ?? 0;

    const contingencyAmount =
      ((plannedDirectCosts + indirectCosts) * contingencyRate) / 100;

    const plannedBudget =
      plannedDirectCosts + indirectCosts + contingencyAmount;

    const consumedBudget = actualDirectCosts;
    const remainingBudget = plannedBudget - consumedBudget;
    const variance = consumedBudget - plannedBudget;

    const consumptionRate =
      plannedBudget > 0
        ? Math.round((consumedBudget / plannedBudget) * 100)
        : 0;

    return {
      reportContext: {
        type: 'PROJECT_FINANCIAL_REPORT',
        generatedAt: new Date(),
        periodStart: options?.periodStart
          ? new Date(options.periodStart)
          : null,
        periodEnd: options?.periodEnd ? new Date(options.periodEnd) : null,
      },

      project: {
        id: project.id,
        name: project.name,
        code: project.code,
        client: project.client,
        status: project.status,
        type: project.type,
        startDate: project.startDate,
        endDate: project.endDate,
      },

      summary: {
        plannedBudget,
        consumedBudget,
        remainingBudget,
        variance,
        consumptionRate,
        financialStatus: this.getFinancialStatus(consumptionRate, variance),
      },

      directCosts: {
        planned: {
          labor: plannedLabor,
          equipment: plannedEquipment,
          material: plannedMaterial,
          total: plannedDirectCosts,
        },
        actual: {
          labor: actualLabor,
          equipment: actualEquipment,
          material: actualMaterial,
          total: actualDirectCosts,
        },
        variance: {
          labor: actualLabor - plannedLabor,
          equipment: actualEquipment - plannedEquipment,
          material: actualMaterial - plannedMaterial,
          total: actualDirectCosts - plannedDirectCosts,
        },
      },

      indirectCosts: {
        total: indirectCosts,
        items:
          project.budgetDetails?.items.map((item) => ({
            id: item.id,
            category: item.category,
            label: item.label,
            amount: item.amount,
            notes: item.notes,
          })) ?? [],
      },

      contingency: {
        rate: contingencyRate,
        amount: contingencyAmount,
        used: project.budgetDetails?.contingencyUsed ?? 0,
      },

      phases,

      highestVariancePhases: phases
        .filter((phase) => phase.variance.total > 0)
        .sort((a, b) => b.variance.total - a.variance.total)
        .slice(0, 5),
    };
  }

  async generateProjectFinancialReport(
    projectId: number,
    user: CurrentUser,
    options?: GenerateFinancialReportOptions,
  ) {
    if (!user.tenantId) {
      throw new BadRequestException('Utilisateur sans tenant.');
    }

    const financialData = await this.getProjectFinancialDataForReport(
      projectId,
      user.tenantId,
      options,
    );

    if (!financialData) {
      throw new NotFoundException('Projet introuvable.');
    }

    const report =
      (await this.openRouterFinancialReportService.generateFinancialReport(
        financialData,
      )) as Prisma.InputJsonValue;

    return this.prisma.projectFinancialReport.create({
      data: {
        projectId,
        report,
        provider: 'openrouter',
        model:
          process.env.OPENROUTER_REPORT_MODEL ||
          process.env.OPENROUTER_MODEL ||
          'nvidia/nemotron-3-super:free',
        generatedBy: user.id,
        periodStart: options?.periodStart
          ? new Date(options.periodStart)
          : null,
        periodEnd: options?.periodEnd ? new Date(options.periodEnd) : null,
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getLatestReport(projectId: number) {
    return this.prisma.projectFinancialReport.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getReportHistory(projectId: number) {
    return this.prisma.projectFinancialReport.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReportById(id: number) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const report = await this.prisma.projectFinancialReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('Rapport financier introuvable.');
    }

    return report;
  }

  async deleteReport(id: number) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const report = await this.prisma.projectFinancialReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('Rapport financier introuvable.');
    }

    return this.prisma.projectFinancialReport.delete({
      where: { id },
    });
  }
}
