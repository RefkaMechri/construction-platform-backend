import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { TaskDependencyType } from '@prisma/client';

type SimTask = {
  id: number;
  name: string;
  phaseName: string;
  startDate: Date | null;
  endDate: Date | null;
};

@Injectable()
export class PlanningImpactSimulationService {
  constructor(private readonly prisma: PrismaService) {}

  private addDays(date: Date, days: number) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private diffDays(start: Date, end: Date) {
    const s = new Date(start);
    const e = new Date(end);

    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);

    return Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  }

  private durationMs(start: Date, end: Date) {
    return end.getTime() - start.getTime();
  }

  private computeNewDatesFromDependency(
    predecessor: SimTask,
    successor: SimTask,
    type: TaskDependencyType,
    lagDays: number,
  ) {
    if (
      !predecessor.startDate ||
      !predecessor.endDate ||
      !successor.startDate ||
      !successor.endDate
    ) {
      return null;
    }

    const duration = this.durationMs(successor.startDate, successor.endDate);

    if (type === 'FINISH_TO_START') {
      const newStart = this.addDays(predecessor.endDate, lagDays);
      return {
        startDate: newStart,
        endDate: new Date(newStart.getTime() + duration),
      };
    }

    if (type === 'START_TO_START') {
      const newStart = this.addDays(predecessor.startDate, lagDays);
      return {
        startDate: newStart,
        endDate: new Date(newStart.getTime() + duration),
      };
    }

    if (type === 'FINISH_TO_FINISH') {
      const newEnd = this.addDays(predecessor.endDate, lagDays);
      return {
        startDate: new Date(newEnd.getTime() - duration),
        endDate: newEnd,
      };
    }

    if (type === 'START_TO_FINISH') {
      const newEnd = this.addDays(predecessor.startDate, lagDays);
      return {
        startDate: new Date(newEnd.getTime() - duration),
        endDate: newEnd,
      };
    }

    return null;
  }

  async simulate(taskId: number, dto: { startDate: string; endDate: string }) {
    const newStartDate = new Date(dto.startDate);
    const newEndDate = new Date(dto.endDate);

    if (newEndDate < newStartDate) {
      throw new BadRequestException(
        'La date de fin doit être supérieure ou égale à la date de début.',
      );
    }

    const changedTask = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        phase: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!changedTask) {
      throw new NotFoundException('Tâche introuvable.');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: changedTask.phase.projectId },
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

    const tasks: SimTask[] = project.phases.flatMap((phase) =>
      phase.tasks.map((task) => ({
        id: task.id,
        name: task.name,
        phaseName: phase.name,
        startDate: task.startDate,
        endDate: task.endDate,
      })),
    );

    const taskIds = tasks.map((task) => task.id);

    const dependencies = await this.prisma.taskDependency.findMany({
      where: {
        predecessorTaskId: { in: taskIds },
        successorTaskId: { in: taskIds },
      },
    });

    const oldMap = new Map<number, SimTask>();
    const simulatedMap = new Map<number, SimTask>();

    for (const task of tasks) {
      oldMap.set(task.id, { ...task });
      simulatedMap.set(task.id, { ...task });
    }

    simulatedMap.set(taskId, {
      ...simulatedMap.get(taskId)!,
      startDate: newStartDate,
      endDate: newEndDate,
    });

    const queue = [taskId];
    const visited = new Set<number>();

    while (queue.length) {
      const currentId = queue.shift()!;

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const outgoingDeps = dependencies.filter(
        (dep) => dep.predecessorTaskId === currentId,
      );

      for (const dep of outgoingDeps) {
        const predecessor = simulatedMap.get(dep.predecessorTaskId);
        const successor = simulatedMap.get(dep.successorTaskId);

        if (!predecessor || !successor) continue;

        const computed = this.computeNewDatesFromDependency(
          predecessor,
          successor,
          dep.type,
          dep.lagDays ?? 0,
        );

        if (!computed) continue;

        const currentSuccessor = simulatedMap.get(dep.successorTaskId)!;

        const shouldMove =
          !currentSuccessor.startDate ||
          !currentSuccessor.endDate ||
          computed.startDate > currentSuccessor.startDate ||
          computed.endDate > currentSuccessor.endDate;

        if (shouldMove) {
          simulatedMap.set(dep.successorTaskId, {
            ...currentSuccessor,
            startDate: computed.startDate,
            endDate: computed.endDate,
          });

          queue.push(dep.successorTaskId);
        }
      }
    }

    const affectedTasks = Array.from(simulatedMap.values())
      .filter((task) => task.id !== taskId)
      .filter((task) => {
        const oldTask = oldMap.get(task.id);

        return (
          oldTask?.startDate?.getTime() !== task.startDate?.getTime() ||
          oldTask?.endDate?.getTime() !== task.endDate?.getTime()
        );
      })
      .map((task) => {
        const oldTask = oldMap.get(task.id)!;

        return {
          taskId: task.id,
          taskName: task.name,
          phaseName: task.phaseName,
          oldStartDate: oldTask.startDate,
          oldEndDate: oldTask.endDate,
          newStartDate: task.startDate,
          newEndDate: task.endDate,
          delayDays:
            oldTask.endDate && task.endDate
              ? Math.max(0, this.diffDays(oldTask.endDate, task.endDate))
              : 0,
        };
      });

    const oldProjectEndDate = project.endDate;

    const newProjectEndDate = new Date(
      Math.max(
        ...Array.from(simulatedMap.values())
          .filter((task) => task.endDate)
          .map((task) => task.endDate!.getTime()),
      ),
    );

    const projectDelayDays = Math.max(
      0,
      this.diffDays(oldProjectEndDate, newProjectEndDate),
    );

    return {
      changedTask: {
        taskId: changedTask.id,
        taskName: changedTask.name,
        oldStartDate: changedTask.startDate,
        oldEndDate: changedTask.endDate,
        newStartDate,
        newEndDate,
      },
      affectedTasks,
      projectImpact: {
        oldProjectEndDate,
        newProjectEndDate,
        delayDays: projectDelayDays,
      },
    };
  }
}
