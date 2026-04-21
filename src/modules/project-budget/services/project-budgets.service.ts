import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

type TaskDirectCosts = {
  taskId: number;
  taskName: string;
  labor: number;
  equipment: number;
  material: number;
  total: number;
};

type PhaseDirectCosts = {
  phaseId: number;
  phaseName: string;
  tasks: TaskDirectCosts[];
  totals: {
    labor: number;
    equipment: number;
    material: number;
    total: number;
  };
};

type ProjectDirectCosts = {
  projectId: number;
  projectName: string;
  phases: PhaseDirectCosts[];
  totals: {
    labor: number;
    equipment: number;
    material: number;
    total: number;
  };
};

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
}
