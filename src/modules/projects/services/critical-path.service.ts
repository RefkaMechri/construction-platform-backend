import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CriticalTaskResult } from '../types/task.types';

type CurrentUser = {
  tenantId: number | null;
};

@Injectable()
export class CriticalPathService {
  constructor(private readonly prisma: PrismaService) {}

  private diffInDays(start: Date, end: Date): number {
    const s = new Date(start);
    const e = new Date(end);
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    return Math.max(
      1,
      Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    );
  }

  async getProjectCriticalPath(projectId: number, user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException("L'utilisateur n'est lié à aucun tenant.");
    }

    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        tenantId: user.tenantId,
      },
      include: {
        phases: {
          include: {
            tasks: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable.');
    }

    const allTasks = project.phases.flatMap((phase) =>
      phase.tasks.map((task) => ({
        ...task,
        phaseName: phase.name,
      })),
    );

    if (!allTasks.length) {
      return {
        projectId,
        projectName: project.name,
        projectDurationDays: 0,
        totalTasks: 0,
        criticalTasksCount: 0,
        criticalPath: [],
      };
    }

    const validTasks = allTasks.filter(
      (task) => task.startDate && task.endDate,
    );

    if (!validTasks.length) {
      return {
        projectId,
        projectName: project.name,
        projectDurationDays: 0,
        totalTasks: 0,
        criticalTasksCount: 0,
        criticalPath: [],
      };
    }

    const taskIds = validTasks.map((task) => task.id);

    const dependencies = await this.prisma.taskDependency.findMany({
      where: {
        predecessorTaskId: { in: taskIds },
        successorTaskId: { in: taskIds },
        type: 'FINISH_TO_START',
      },
    });

    const taskMap = new Map(
      validTasks.map((task) => [
        task.id,
        {
          ...task,
          durationDays: this.diffInDays(
            task.startDate as Date,
            task.endDate as Date,
          ),
          es: 0,
          ef: 0,
          ls: 0,
          lf: 0,
          slack: 0,
        },
      ]),
    );

    const successors = new Map<number, number[]>();
    const predecessors = new Map<number, number[]>();
    const inDegree = new Map<number, number>();

    for (const task of validTasks) {
      successors.set(task.id, []);
      predecessors.set(task.id, []);
      inDegree.set(task.id, 0);
    }

    for (const dep of dependencies) {
      if (
        !taskMap.has(dep.predecessorTaskId) ||
        !taskMap.has(dep.successorTaskId)
      ) {
        continue;
      }

      successors.get(dep.predecessorTaskId)?.push(dep.successorTaskId);
      predecessors.get(dep.successorTaskId)?.push(dep.predecessorTaskId);
      inDegree.set(
        dep.successorTaskId,
        (inDegree.get(dep.successorTaskId) || 0) + 1,
      );
    }

    // Topological sort
    const queue: number[] = [];
    for (const [taskId, degree] of inDegree.entries()) {
      if (degree === 0) queue.push(taskId);
    }

    const topoOrder: number[] = [];

    while (queue.length) {
      const current = queue.shift()!;
      topoOrder.push(current);

      for (const next of successors.get(current) || []) {
        const nextDegree = (inDegree.get(next) || 0) - 1;
        inDegree.set(next, nextDegree);
        if (nextDegree === 0) {
          queue.push(next);
        }
      }
    }

    if (topoOrder.length !== validTasks.length) {
      throw new BadRequestException(
        'Impossible de calculer le chemin critique : cycle détecté dans les dépendances.',
      );
    }

    // Forward pass
    for (const taskId of topoOrder) {
      const task = taskMap.get(taskId)!;
      const preds = predecessors.get(taskId) || [];

      if (!preds.length) {
        task.es = 0;
      } else {
        task.es = Math.max(...preds.map((predId) => taskMap.get(predId)!.ef));
      }

      task.ef = task.es + task.durationDays;
    }

    const projectDurationDays = Math.max(
      ...Array.from(taskMap.values()).map((task) => task.ef),
    );

    // Backward pass
    for (let i = topoOrder.length - 1; i >= 0; i--) {
      const taskId = topoOrder[i];
      const task = taskMap.get(taskId)!;
      const succs = successors.get(taskId) || [];

      if (!succs.length) {
        task.lf = projectDurationDays;
      } else {
        task.lf = Math.min(...succs.map((succId) => taskMap.get(succId)!.ls));
      }

      task.ls = task.lf - task.durationDays;
      task.slack = task.ls - task.es;
    }

    const results: CriticalTaskResult[] = Array.from(taskMap.values()).map(
      (task) => ({
        taskId: task.id,
        taskName: task.name,
        phaseId: task.phaseId,
        phaseName: task.phaseName,
        startDate: task.startDate ? task.startDate.toISOString() : null,
        endDate: task.endDate ? task.endDate.toISOString() : null,
        durationDays: task.durationDays,
        es: task.es,
        ef: task.ef,
        ls: task.ls,
        lf: task.lf,
        slack: task.slack,
        isCritical: task.slack === 0,
      }),
    );

    const criticalPath = results
      .filter((task) => task.isCritical)
      .sort((a, b) => a.es - b.es);

    return {
      projectId,
      projectName: project.name,
      projectDurationDays,
      totalTasks: results.length,
      criticalTasksCount: criticalPath.length,
      criticalPath,
      allTasks: results,
    };
  }
}
