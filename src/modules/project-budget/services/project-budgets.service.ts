import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import {
  BudgetVarianceStatus,
  PhaseActualDirectCosts,
  PhaseDirectCosts,
  PhaseDirectCostsVariance,
  ProjectActualDirectCosts,
  ProjectDirectCosts,
  ProjectDirectCostsVariance,
  TaskActualDirectCosts,
  TaskDirectCosts,
  TaskDirectCostsVariance,
} from '../types/Budget';

@Injectable()
export class ProjectBudgetsService {
  constructor(private readonly prisma: PrismaService) {}
  async updateContingencyRate(projectId: number, contingencyRate: number) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        budgetDetails: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }

    const existingBudget = project.budgetDetails;

    if (!existingBudget) {
      const directCostsTotal = 0;
      const indirectCostsTotal = 0;
      const contingencyAmount =
        ((directCostsTotal + indirectCostsTotal) * contingencyRate) / 100;
      const totalBudget =
        directCostsTotal + indirectCostsTotal + contingencyAmount;

      return this.prisma.projectBudget.create({
        data: {
          project: {
            connect: { id: projectId },
          },
          directCostsTotal,
          indirectCostsTotal,
          contingencyRate,
          contingencyUsed: 0,
          totalBudget,
        },
      });
    }

    const directCostsTotal = existingBudget.directCostsTotal ?? 0;
    const indirectCostsTotal = existingBudget.indirectCostsTotal ?? 0;

    const contingencyAmount =
      ((directCostsTotal + indirectCostsTotal) * contingencyRate) / 100;

    const totalBudget =
      directCostsTotal + indirectCostsTotal + contingencyAmount;

    return this.prisma.projectBudget.update({
      where: { id: existingBudget.id },
      data: {
        contingencyRate,
        totalBudget,
      },
    });
  }
  private calculateInclusiveDays(startDate: Date, endDate: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;

    const start = new Date(startDate);
    const end = new Date(endDate);

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
  }

  async calculateTaskDirectCosts(taskId: number): Promise<TaskDirectCosts> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
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
    });

    if (!task) {
      throw new NotFoundException('Tâche introuvable');
    }

    const labor = task.assignments.reduce((sum, assignment) => {
      const dailyCost = assignment.employee.dailyCost ?? 0;
      const days = this.calculateInclusiveDays(
        assignment.startDate,
        assignment.endDate,
      );

      return sum + days * dailyCost;
    }, 0);

    const equipment = task.assignmentsEq.reduce((sum, assignment) => {
      const dailyCost = assignment.equipment.dailyCost ?? 0;
      const days = this.calculateInclusiveDays(
        assignment.startDate,
        assignment.endDate,
      );

      return sum + days * dailyCost;
    }, 0);

    const material = task.assignmentsMt.reduce((sum, assignment) => {
      const unitPrice = assignment.material.unitPrice ?? 0;
      const quantity = assignment.quantity ?? 0;

      return sum + quantity * unitPrice;
    }, 0);

    const total = labor + equipment + material;

    return {
      taskId: task.id,
      taskName: task.name,
      labor,
      equipment,
      material,
      total,
    };
  }

  async getPhaseDirectCosts(phaseId: number): Promise<PhaseDirectCosts> {
    const phase = await this.prisma.phase.findUnique({
      where: { id: phaseId },
      include: {
        tasks: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!phase) {
      throw new NotFoundException('Phase introuvable');
    }

    const tasks: TaskDirectCosts[] = [];
    const totals = {
      labor: 0,
      equipment: 0,
      material: 0,
      total: 0,
    };

    for (const task of phase.tasks) {
      const taskCosts = await this.calculateTaskDirectCosts(task.id);

      tasks.push(taskCosts);
      totals.labor += taskCosts.labor;
      totals.equipment += taskCosts.equipment;
      totals.material += taskCosts.material;
      totals.total += taskCosts.total;
    }

    return {
      phaseId: phase.id,
      phaseName: phase.name,
      tasks,
      totals,
    };
  }

  async getProjectDirectCosts(projectId: number): Promise<ProjectDirectCosts> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        phases: {
          select: {
            id: true,
            name: true,
          },
        },
        budgetDetails: true, // relation Project -> ProjectBudget
      },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }

    const phases: PhaseDirectCosts[] = [];
    const totals = {
      labor: 0,
      equipment: 0,
      material: 0,
      total: 0,
    };

    for (const phase of project.phases) {
      const phaseCosts = await this.getPhaseDirectCosts(phase.id);

      phases.push(phaseCosts);
      totals.labor += phaseCosts.totals.labor;
      totals.equipment += phaseCosts.totals.equipment;
      totals.material += phaseCosts.totals.material;
      totals.total += phaseCosts.totals.total;
    }

    const existingBudget = project.budgetDetails;

    if (!existingBudget) {
      await this.prisma.projectBudget.create({
        data: {
          project: {
            connect: { id: project.id },
          },
          directCostsTotal: totals.total,
          indirectCostsTotal: 0,
          contingencyRate: 0,
          contingencyUsed: 0,
          totalBudget: totals.total,
        },
      });
    } else {
      const indirectCostsTotal = existingBudget.indirectCostsTotal ?? 0;
      const contingencyRate = existingBudget.contingencyRate ?? 0;

      const contingencyAmount =
        ((totals.total + indirectCostsTotal) * contingencyRate) / 100;

      const totalBudget = totals.total + indirectCostsTotal + contingencyAmount;

      await this.prisma.projectBudget.update({
        where: { id: existingBudget.id },
        data: {
          directCostsTotal: totals.total,
          totalBudget,
        },
      });
    }

    return {
      projectId: project.id,
      projectName: project.name,
      phases,
      totals,
    };
  }

  async syncProjectBudgetDirectCosts(projectId: number): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        phases: {
          select: {
            id: true,
          },
        },
        budgetDetails: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }

    let directCostsTotal = 0;

    for (const phase of project.phases) {
      const phaseCosts = await this.getPhaseDirectCosts(phase.id);
      directCostsTotal += phaseCosts.totals.total;
    }

    const existingBudget = project.budgetDetails;

    if (!existingBudget) {
      await this.prisma.projectBudget.create({
        data: {
          project: {
            connect: { id: projectId },
          },
          directCostsTotal,
          indirectCostsTotal: 0,
          contingencyRate: 0,
          contingencyUsed: 0,
          totalBudget: directCostsTotal,
        },
      });

      return;
    }

    const indirectCostsTotal = existingBudget.indirectCostsTotal ?? 0;
    const contingencyRate = existingBudget.contingencyRate ?? 0;

    const contingencyAmount =
      ((directCostsTotal + indirectCostsTotal) * contingencyRate) / 100;

    const totalBudget =
      directCostsTotal + indirectCostsTotal + contingencyAmount;

    await this.prisma.projectBudget.update({
      where: { id: existingBudget.id },
      data: {
        directCostsTotal,
        totalBudget,
      },
    });
  }
  async getContingencyRate(projectId: number): Promise<{
    contingencyRate: number;
    totalDirectAndIndirectCosts: number;
  }> {
    const projectBudget = await this.prisma.projectBudget.findUnique({
      where: { projectId },
    });

    if (!projectBudget) {
      throw new NotFoundException('Budget du projet introuvable');
    }

    const totalDirectAndIndirectCosts =
      (projectBudget.directCostsTotal ?? 0) +
      (projectBudget.indirectCostsTotal ?? 0);

    return {
      contingencyRate: projectBudget.contingencyRate ?? 0,
      totalDirectAndIndirectCosts,
    };
  }

  async getProjectBudgetSummary(projectId: number) {
    const projectBudget = await this.prisma.projectBudget.findUnique({
      where: { projectId },
    });

    if (!projectBudget) {
      throw new NotFoundException('Budget du projet introuvable');
    }

    return projectBudget;
  }
  async calculateTaskActualDirectCosts(
    taskId: number,
  ): Promise<TaskActualDirectCosts> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
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
    });

    if (!task) {
      throw new NotFoundException('Tâche introuvable');
    }

    const shouldConsumePlannedCosts =
      task.status === 'IN_PROGRESS' || task.status === 'DONE';

    const labor = shouldConsumePlannedCosts
      ? task.assignments.reduce((sum, assignment) => {
          const dailyCost = assignment.employee.dailyCost ?? 0;
          const days = this.calculateInclusiveDays(
            assignment.startDate,
            assignment.endDate,
          );

          return sum + days * dailyCost;
        }, 0)
      : 0;

    const equipment = shouldConsumePlannedCosts
      ? task.assignmentsEq.reduce((sum, assignment) => {
          const dailyCost = assignment.equipment.dailyCost ?? 0;
          const days = this.calculateInclusiveDays(
            assignment.startDate,
            assignment.endDate,
          );

          return sum + days * dailyCost;
        }, 0)
      : 0;

    const material = task.assignmentsMt.reduce((sum, assignment) => {
      const unitPrice = assignment.material.unitPrice ?? 0;
      const usedQuantity = assignment.usedQuantity ?? 0;

      return sum + usedQuantity * unitPrice;
    }, 0);

    const total = labor + equipment + material;

    return {
      taskId: task.id,
      taskName: task.name,
      labor,
      equipment,
      material,
      total,
    };
  }

  async getPhaseActualDirectCosts(
    phaseId: number,
  ): Promise<PhaseActualDirectCosts> {
    const phase = await this.prisma.phase.findUnique({
      where: { id: phaseId },
      include: {
        tasks: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!phase) {
      throw new NotFoundException('Phase introuvable');
    }

    const tasks: TaskActualDirectCosts[] = [];

    const totals = {
      labor: 0,
      equipment: 0,
      material: 0,
      total: 0,
    };

    for (const task of phase.tasks) {
      const taskCosts = await this.calculateTaskActualDirectCosts(task.id);

      tasks.push(taskCosts);
      totals.labor += taskCosts.labor;
      totals.equipment += taskCosts.equipment;
      totals.material += taskCosts.material;
      totals.total += taskCosts.total;
    }

    return {
      phaseId: phase.id,
      phaseName: phase.name,
      tasks,
      totals,
    };
  }

  async getProjectActualDirectCosts(
    projectId: number,
  ): Promise<ProjectActualDirectCosts> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        phases: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }

    const phases: PhaseActualDirectCosts[] = [];

    const totals = {
      labor: 0,
      equipment: 0,
      material: 0,
      total: 0,
    };

    for (const phase of project.phases) {
      const phaseCosts = await this.getPhaseActualDirectCosts(phase.id);

      phases.push(phaseCosts);
      totals.labor += phaseCosts.totals.labor;
      totals.equipment += phaseCosts.totals.equipment;
      totals.material += phaseCosts.totals.material;
      totals.total += phaseCosts.totals.total;
    }

    return {
      projectId: project.id,
      projectName: project.name,
      phases,
      totals,
    };
  }
  private getConsumptionRate(actual: number, planned: number): number {
    if (!planned || planned <= 0) return 0;
    return Math.round((actual / planned) * 100);
  }

  private getVarianceStatus(
    actual: number,
    planned: number,
  ): BudgetVarianceStatus {
    if (actual > planned) return 'OVER';
    if (actual < planned) return 'UNDER';
    return 'ON_TRACK';
  }
  async getProjectDirectCostsVariance(
    projectId: number,
  ): Promise<ProjectDirectCostsVariance> {
    const planned = await this.getProjectDirectCosts(projectId);
    const actual = await this.getProjectActualDirectCosts(projectId);

    const phases: PhaseDirectCostsVariance[] = planned.phases.map(
      (plannedPhase) => {
        const actualPhase = actual.phases.find(
          (phase) => phase.phaseId === plannedPhase.phaseId,
        );

        const tasks: TaskDirectCostsVariance[] = plannedPhase.tasks.map(
          (plannedTask) => {
            const actualTask = actualPhase?.tasks.find(
              (task) => task.taskId === plannedTask.taskId,
            );

            const actualTaskCosts = {
              labor: actualTask?.labor ?? 0,
              equipment: actualTask?.equipment ?? 0,
              material: actualTask?.material ?? 0,
              total: actualTask?.total ?? 0,
            };

            const variance = {
              labor: actualTaskCosts.labor - plannedTask.labor,
              equipment: actualTaskCosts.equipment - plannedTask.equipment,
              material: actualTaskCosts.material - plannedTask.material,
              total: actualTaskCosts.total - plannedTask.total,
            };

            return {
              taskId: plannedTask.taskId,
              taskName: plannedTask.taskName,

              planned: {
                labor: plannedTask.labor,
                equipment: plannedTask.equipment,
                material: plannedTask.material,
                total: plannedTask.total,
              },

              actual: actualTaskCosts,
              variance,

              consumptionRate: this.getConsumptionRate(
                actualTaskCosts.total,
                plannedTask.total,
              ),

              status: this.getVarianceStatus(
                actualTaskCosts.total,
                plannedTask.total,
              ),
            };
          },
        );

        const actualPhaseCosts = {
          labor: actualPhase?.totals.labor ?? 0,
          equipment: actualPhase?.totals.equipment ?? 0,
          material: actualPhase?.totals.material ?? 0,
          total: actualPhase?.totals.total ?? 0,
        };

        const variance = {
          labor: actualPhaseCosts.labor - plannedPhase.totals.labor,
          equipment: actualPhaseCosts.equipment - plannedPhase.totals.equipment,
          material: actualPhaseCosts.material - plannedPhase.totals.material,
          total: actualPhaseCosts.total - plannedPhase.totals.total,
        };

        return {
          phaseId: plannedPhase.phaseId,
          phaseName: plannedPhase.phaseName,
          tasks,

          planned: {
            labor: plannedPhase.totals.labor,
            equipment: plannedPhase.totals.equipment,
            material: plannedPhase.totals.material,
            total: plannedPhase.totals.total,
          },

          actual: actualPhaseCosts,
          variance,

          consumptionRate: this.getConsumptionRate(
            actualPhaseCosts.total,
            plannedPhase.totals.total,
          ),

          status: this.getVarianceStatus(
            actualPhaseCosts.total,
            plannedPhase.totals.total,
          ),
        };
      },
    );

    const projectActual = {
      labor: actual.totals.labor,
      equipment: actual.totals.equipment,
      material: actual.totals.material,
      total: actual.totals.total,
    };

    const projectPlanned = {
      labor: planned.totals.labor,
      equipment: planned.totals.equipment,
      material: planned.totals.material,
      total: planned.totals.total,
    };

    const variance = {
      labor: projectActual.labor - projectPlanned.labor,
      equipment: projectActual.equipment - projectPlanned.equipment,
      material: projectActual.material - projectPlanned.material,
      total: projectActual.total - projectPlanned.total,
    };

    return {
      projectId: planned.projectId,
      projectName: planned.projectName,
      phases,

      planned: projectPlanned,
      actual: projectActual,
      variance,

      consumptionRate: this.getConsumptionRate(
        projectActual.total,
        projectPlanned.total,
      ),

      status: this.getVarianceStatus(projectActual.total, projectPlanned.total),
    };
  }
  async getProjectBudgetOverview(projectId: number) {
    const variance = await this.getProjectDirectCostsVariance(projectId);

    const budgetInitial = variance.planned.total;
    const budgetConsomme = variance.actual.total;
    const budgetRestant = budgetInitial - budgetConsomme;
    const ecartGlobal = variance.variance.total;

    const status =
      budgetConsomme > budgetInitial
        ? 'OVER'
        : variance.consumptionRate >= 80
          ? 'WARNING'
          : 'ON_TRACK';

    const criticalPhase = variance.phases
      .filter((phase) => phase.variance.total > 0)
      .sort((a, b) => b.variance.total - a.variance.total)[0];

    return {
      projectId,
      projectName: variance.projectName,
      budgetInitial,
      budgetConsomme,
      budgetRestant,
      ecartGlobal,
      consumptionRate: variance.consumptionRate,
      status,
      criticalPhase: criticalPhase
        ? {
            phaseId: criticalPhase.phaseId,
            phaseName: criticalPhase.phaseName,
            variance: criticalPhase.variance.total,
          }
        : null,
    };
  }
  async getBudgetModuleForProjectManager(
    projectManagerId: number,
    projectId: number,
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        projectManagerId,
      },
      include: {
        budgetDetails: true,
      },
    });

    if (!project) {
      throw new NotFoundException(
        'Projet introuvable ou non affecté à ce chef de projet',
      );
    }

    await this.syncProjectBudgetDirectCosts(projectId);

    const variance = await this.getProjectDirectCostsVariance(projectId);

    const budget = await this.prisma.projectBudget.findUnique({
      where: { projectId },
    });

    if (!budget) {
      throw new NotFoundException('Budget du projet introuvable');
    }

    const directCostsTotal = budget.directCostsTotal ?? 0;
    const indirectCostsTotal = budget.indirectCostsTotal ?? 0;
    const contingencyRate = budget.contingencyRate ?? 0;

    const contingencyAmount =
      ((directCostsTotal + indirectCostsTotal) * contingencyRate) / 100;

    const budgetPrevisionnel = budget.totalBudget ?? 0;
    const budgetConsomme = variance.actual.total;
    const ecartBudgetaire = budgetConsomme - budgetPrevisionnel;

    return {
      projectId: project.id,
      projectName: project.name,

      budgetPrevisionnel: {
        directCostsTotal,
        indirectCostsTotal,
        contingencyRate,
        contingencyAmount,
        total: budgetPrevisionnel,
      },

      budgetConsomme: {
        directCostsConsumed: variance.actual.total,
        total: budgetConsomme,
        consumptionRate:
          budgetPrevisionnel > 0
            ? Math.round((budgetConsomme / budgetPrevisionnel) * 100)
            : 0,
      },

      ecartsBudgetaires: {
        ecart: ecartBudgetaire,
        status:
          budgetConsomme > budgetPrevisionnel
            ? 'OVER'
            : budgetConsomme >= budgetPrevisionnel * 0.8
              ? 'WARNING'
              : 'ON_TRACK',
      },

      coutsParPhase: variance.phases.map((phase) => ({
        phaseId: phase.phaseId,
        phaseName: phase.phaseName,
        budgetPrevisionnel: phase.planned.total,
        budgetConsomme: phase.actual.total,
        ecart: phase.variance.total,
        consumptionRate: phase.consumptionRate,
        status: phase.status,
      })),
    };
  }
}
