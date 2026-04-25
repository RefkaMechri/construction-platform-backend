import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { TaskDependencyType } from '@prisma/client';

type CurrentUser = {
  tenantId: number | null;
};

type CpmTask = {
  id: number;
  name: string;
  phaseId: number;
  phaseName: string;
  parentTaskId: number | null;
  startDate: Date | null;
  endDate: Date | null;
  durationDays: number;
  es: number;
  ef: number;
  ls: number;
  lf: number;
  totalFloat: number;
  freeFloat: number;
};

type CpmDependency = {
  predecessorTaskId: number;
  successorTaskId: number;
  type: TaskDependencyType;
  lagDays: number;
};

@Injectable()
export class CriticalPathService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly CRITICAL_TOLERANCE = 0;

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

  private getSuccessorEarlyStart(
    pred: CpmTask,
    succ: CpmTask,
    dep: CpmDependency,
  ): number {
    const lag = dep.lagDays ?? 0;

    switch (dep.type) {
      case 'FINISH_TO_START':
        return pred.ef + lag;

      case 'START_TO_START':
        return pred.es + lag;

      case 'FINISH_TO_FINISH':
        return pred.ef + lag - succ.durationDays;

      case 'START_TO_FINISH':
        return pred.es + lag - succ.durationDays;

      default:
        return pred.ef + lag;
    }
  }

  private getPredecessorLateFinish(
    pred: CpmTask,
    succ: CpmTask,
    dep: CpmDependency,
  ): number {
    const lag = dep.lagDays ?? 0;

    switch (dep.type) {
      case 'FINISH_TO_START':
        return succ.ls - lag;

      case 'START_TO_START':
        return succ.ls - lag + pred.durationDays;

      case 'FINISH_TO_FINISH':
        return succ.lf - lag;

      case 'START_TO_FINISH':
        return succ.lf - lag + pred.durationDays;

      default:
        return succ.ls - lag;
    }
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

    const rawTasks = project.phases.flatMap((phase) =>
      phase.tasks.map((task) => ({
        ...task,
        phaseName: phase.name,
      })),
    );

    const validTasks = rawTasks.filter(
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
        criticalTasks: [],
        criticalPaths: [],
        allTasks: [],
      };
    }

    const taskIds = validTasks.map((task) => task.id);

    const dependencies = await this.prisma.taskDependency.findMany({
      where: {
        predecessorTaskId: { in: taskIds },
        successorTaskId: { in: taskIds },
      },
      select: {
        predecessorTaskId: true,
        successorTaskId: true,
        type: true,
        lagDays: true,
      },
    });

    const taskMap = new Map<number, CpmTask>(
      validTasks.map((task) => [
        task.id,
        {
          id: task.id,
          name: task.name,
          phaseId: task.phaseId,
          phaseName: task.phaseName,
          parentTaskId: task.parentTaskId ?? null,
          startDate: task.startDate,
          endDate: task.endDate,
          durationDays: this.diffInDays(task.startDate!, task.endDate!),
          es: 0,
          ef: 0,
          ls: 0,
          lf: 0,
          totalFloat: 0,
          freeFloat: 0,
        },
      ]),
    );

    const successors = new Map<number, CpmDependency[]>();
    const predecessors = new Map<number, CpmDependency[]>();
    const inDegree = new Map<number, number>();

    for (const task of validTasks) {
      successors.set(task.id, []);
      predecessors.set(task.id, []);
      inDegree.set(task.id, 0);
    }

    for (const dep of dependencies) {
      successors.get(dep.predecessorTaskId)!.push(dep);
      predecessors.get(dep.successorTaskId)!.push(dep);

      inDegree.set(
        dep.successorTaskId,
        (inDegree.get(dep.successorTaskId) || 0) + 1,
      );
    }

    const queue: number[] = [];

    for (const [taskId, degree] of inDegree.entries()) {
      if (degree === 0) queue.push(taskId);
    }

    const topoOrder: number[] = [];

    while (queue.length) {
      const current = queue.shift()!;
      topoOrder.push(current);

      for (const dep of successors.get(current) || []) {
        const next = dep.successorTaskId;
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

    for (const taskId of topoOrder) {
      const task = taskMap.get(taskId)!;
      const preds = predecessors.get(taskId) || [];

      if (!preds.length) {
        task.es = 0;
      } else {
        task.es = Math.max(
          ...preds.map((dep) => {
            const pred = taskMap.get(dep.predecessorTaskId)!;
            return this.getSuccessorEarlyStart(pred, task, dep);
          }),
        );
      }

      task.es = Math.max(0, task.es);
      task.ef = task.es + task.durationDays;
    }

    const projectDurationDays = Math.max(
      ...Array.from(taskMap.values()).map((task) => task.ef),
    );

    for (const task of taskMap.values()) {
      task.lf = projectDurationDays;
      task.ls = task.lf - task.durationDays;
    }

    for (let i = topoOrder.length - 1; i >= 0; i--) {
      const taskId = topoOrder[i];
      const task = taskMap.get(taskId)!;
      const succDeps = successors.get(taskId) || [];

      if (!succDeps.length) {
        task.lf = projectDurationDays;
      } else {
        task.lf = Math.min(
          ...succDeps.map((dep) => {
            const succ = taskMap.get(dep.successorTaskId)!;
            return this.getPredecessorLateFinish(task, succ, dep);
          }),
        );
      }

      task.ls = task.lf - task.durationDays;
      task.totalFloat = task.ls - task.es;
    }

    for (const task of taskMap.values()) {
      const succDeps = successors.get(task.id) || [];

      if (!succDeps.length) {
        task.freeFloat = projectDurationDays - task.ef;
      } else {
        task.freeFloat = Math.min(
          ...succDeps.map((dep) => {
            const succ = taskMap.get(dep.successorTaskId)!;
            const allowedStart = this.getSuccessorEarlyStart(task, succ, dep);
            return allowedStart - task.ef;
          }),
        );
      }
    }

    const allTaskResults = Array.from(taskMap.values())
      .map((task) => ({
        taskId: task.id,
        taskName: task.name,
        phaseId: task.phaseId,
        phaseName: task.phaseName,
        parentTaskId: task.parentTaskId,
        startDate: task.startDate?.toISOString() ?? null,
        endDate: task.endDate?.toISOString() ?? null,
        durationDays: task.durationDays,
        es: task.es,
        ef: task.ef,
        ls: task.ls,
        lf: task.lf,
        slack: task.totalFloat,
        totalFloat: task.totalFloat,
        freeFloat: task.freeFloat,
        isCritical: task.totalFloat <= this.CRITICAL_TOLERANCE,
      }))
      .sort((a, b) => a.es - b.es);

    const criticalTasks = allTaskResults.filter((task) => task.isCritical);

    const criticalTaskIds = new Set(criticalTasks.map((task) => task.taskId));

    const criticalDependencies = dependencies.filter(
      (dep) =>
        criticalTaskIds.has(dep.predecessorTaskId) &&
        criticalTaskIds.has(dep.successorTaskId),
    );

    const criticalPaths = this.buildCriticalPaths(
      criticalTasks.map((task) => task.taskId),
      criticalDependencies,
    ).map((path) =>
      path.map((taskId) => allTaskResults.find((t) => t.taskId === taskId)!),
    );

    return {
      projectId,
      projectName: project.name,
      projectDurationDays,
      totalTasks: allTaskResults.length,
      criticalTasksCount: criticalTasks.length,
      criticalPath: criticalTasks,
      criticalTasks,
      criticalPaths,
      allTasks: allTaskResults,
    };
  }

  private buildCriticalPaths(
    criticalTaskIds: number[],
    dependencies: CpmDependency[],
  ): number[][] {
    const criticalSet = new Set(criticalTaskIds);

    const successors = new Map<number, number[]>();
    const predecessors = new Map<number, number[]>();

    for (const taskId of criticalTaskIds) {
      successors.set(taskId, []);
      predecessors.set(taskId, []);
    }

    for (const dep of dependencies) {
      if (
        criticalSet.has(dep.predecessorTaskId) &&
        criticalSet.has(dep.successorTaskId)
      ) {
        successors.get(dep.predecessorTaskId)?.push(dep.successorTaskId);
        predecessors.get(dep.successorTaskId)?.push(dep.predecessorTaskId);
      }
    }

    const starts = criticalTaskIds.filter(
      (taskId) => (predecessors.get(taskId) || []).length === 0,
    );

    const paths: number[][] = [];

    const dfs = (taskId: number, path: number[]) => {
      const nextTasks = successors.get(taskId) || [];

      if (!nextTasks.length) {
        paths.push([...path, taskId]);
        return;
      }

      for (const next of nextTasks) {
        dfs(next, [...path, taskId]);
      }
    };

    for (const start of starts) {
      dfs(start, []);
    }

    return paths;
  }
}
