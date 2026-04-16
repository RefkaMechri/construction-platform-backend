import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TaskDependencyType } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class TaskSchedulingService {
  constructor(private readonly prisma: PrismaService) {}

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private isSameDate(a: Date | null, b: Date | null): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.getTime() === b.getTime();
  }

  private getDurationMs(startDate: Date | null, endDate: Date | null): number {
    if (!startDate || !endDate) {
      throw new BadRequestException(
        'La tâche doit avoir une date de début et une date de fin.',
      );
    }

    const duration = endDate.getTime() - startDate.getTime();

    if (duration < 0) {
      throw new BadRequestException(
        'La date de fin doit être supérieure ou égale à la date de début.',
      );
    }

    return duration;
  }

  async recomputeTaskFromPredecessors(
    taskId: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx ?? this.prisma;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        predecessors: {
          include: {
            predecessorTask: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Tâche introuvable.');
    }

    if (!task.startDate || !task.endDate) {
      return task;
    }

    if (task.predecessors.length === 0) {
      return task;
    }

    const durationMs = this.getDurationMs(task.startDate, task.endDate);

    let maxStartConstraint: Date | null = null;
    let maxEndConstraint: Date | null = null;

    for (const dependency of task.predecessors) {
      const predecessor = dependency.predecessorTask;
      const lagDays = dependency.lagDays ?? 0;

      switch (dependency.type) {
        case TaskDependencyType.FINISH_TO_START: {
          if (!predecessor.endDate) continue;
          const constrainedStart = this.addDays(predecessor.endDate, lagDays);

          if (!maxStartConstraint || constrainedStart > maxStartConstraint) {
            maxStartConstraint = constrainedStart;
          }
          break;
        }

        case TaskDependencyType.START_TO_START: {
          if (!predecessor.startDate) continue;
          const constrainedStart = this.addDays(predecessor.startDate, lagDays);

          if (!maxStartConstraint || constrainedStart > maxStartConstraint) {
            maxStartConstraint = constrainedStart;
          }
          break;
        }

        case TaskDependencyType.FINISH_TO_FINISH: {
          if (!predecessor.endDate) continue;
          const constrainedEnd = this.addDays(predecessor.endDate, lagDays);

          if (!maxEndConstraint || constrainedEnd > maxEndConstraint) {
            maxEndConstraint = constrainedEnd;
          }
          break;
        }

        case TaskDependencyType.START_TO_FINISH: {
          if (!predecessor.startDate) continue;
          const constrainedEnd = this.addDays(predecessor.startDate, lagDays);

          if (!maxEndConstraint || constrainedEnd > maxEndConstraint) {
            maxEndConstraint = constrainedEnd;
          }
          break;
        }
      }
    }

    let newStartDate = task.startDate;
    let newEndDate = task.endDate;

    if (maxStartConstraint) {
      newStartDate = maxStartConstraint;
      newEndDate = new Date(newStartDate.getTime() + durationMs);
    }

    if (maxEndConstraint) {
      newEndDate = maxEndConstraint;
      newStartDate = new Date(newEndDate.getTime() - durationMs);
    }

    if (maxStartConstraint && maxEndConstraint) {
      const endFromStart = new Date(maxStartConstraint.getTime() + durationMs);

      if (endFromStart < maxEndConstraint) {
        newEndDate = maxEndConstraint;
        newStartDate = new Date(newEndDate.getTime() - durationMs);
      } else {
        newStartDate = maxStartConstraint;
        newEndDate = endFromStart;
      }
    }

    if (
      this.isSameDate(task.startDate, newStartDate) &&
      this.isSameDate(task.endDate, newEndDate)
    ) {
      return task;
    }

    return prisma.task.update({
      where: { id: task.id },
      data: {
        startDate: newStartDate,
        endDate: newEndDate,
      },
    });
  }

  async refreshPhaseDatesFromTasks(
    phaseId: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx ?? this.prisma;

    const phase = await prisma.phase.findUnique({
      where: { id: phaseId },
      include: {
        tasks: {
          select: {
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    if (!phase) {
      throw new NotFoundException('Phase introuvable.');
    }

    const startDates = phase.tasks
      .map((task) => task.startDate)
      .filter((date): date is Date => date !== null);

    const endDates = phase.tasks
      .map((task) => task.endDate)
      .filter((date): date is Date => date !== null);

    const newStartDate = startDates.length
      ? new Date(Math.min(...startDates.map((d) => d.getTime())))
      : null;

    const newEndDate = endDates.length
      ? new Date(Math.max(...endDates.map((d) => d.getTime())))
      : null;

    if (
      this.isSameDate(phase.startDate, newStartDate) &&
      this.isSameDate(phase.endDate, newEndDate)
    ) {
      return phase;
    }

    return prisma.phase.update({
      where: { id: phaseId },
      data: {
        startDate: newStartDate,
        endDate: newEndDate,
      },
    });
  }

  async refreshProjectDatesFromPhases(
    projectId: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx ?? this.prisma;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        phases: {
          select: {
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable.');
    }

    const startDates = project.phases
      .map((phase) => phase.startDate)
      .filter((date): date is Date => date !== null);

    const endDates = project.phases
      .map((phase) => phase.endDate)
      .filter((date): date is Date => date !== null);

    const newStartDate = startDates.length
      ? new Date(Math.min(...startDates.map((d) => d.getTime())))
      : project.startDate;

    const newEndDate = endDates.length
      ? new Date(Math.max(...endDates.map((d) => d.getTime())))
      : project.endDate;

    if (
      this.isSameDate(project.startDate, newStartDate) &&
      this.isSameDate(project.endDate, newEndDate)
    ) {
      return project;
    }

    return prisma.project.update({
      where: { id: projectId },
      data: {
        startDate: newStartDate,
        endDate: newEndDate,
      },
    });
  }

  async rescheduleFromTask(taskId: number) {
    await this.prisma.$transaction(async (tx) => {
      const impactedTaskIds = new Set<number>();
      const queue: number[] = [taskId];

      while (queue.length > 0) {
        const currentTaskId = queue.shift()!;

        if (impactedTaskIds.has(currentTaskId)) continue;
        impactedTaskIds.add(currentTaskId);

        const currentTask = await tx.task.findUnique({
          where: { id: currentTaskId },
          include: {
            successors: true,
          },
        });

        if (!currentTask) continue;

        for (const successorDep of currentTask.successors) {
          await this.recomputeTaskFromPredecessors(
            successorDep.successorTaskId,
            tx,
          );
          queue.push(successorDep.successorTaskId);
        }
      }

      const impactedTasks = await tx.task.findMany({
        where: {
          id: {
            in: Array.from(impactedTaskIds),
          },
        },
        select: {
          id: true,
          phaseId: true,
          phase: {
            select: {
              projectId: true,
            },
          },
        },
      });

      const impactedPhaseIds = new Set<number>();
      const impactedProjectIds = new Set<number>();

      for (const task of impactedTasks) {
        impactedPhaseIds.add(task.phaseId);
        impactedProjectIds.add(task.phase.projectId);
      }

      for (const phaseId of impactedPhaseIds) {
        await this.refreshPhaseDatesFromTasks(phaseId, tx);
      }

      for (const projectId of impactedProjectIds) {
        await this.refreshProjectDatesFromPhases(projectId, tx);
      }
    });
  }
}
