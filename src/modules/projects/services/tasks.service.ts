/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TasksRepository } from '../repositories/tasks.repository';
import { PhasesService } from './phases.service';
import { MilestonesService } from './milestones.service';
import { TaskSchedulingService } from './task-scheduling.service';

type CurrentUser = {
  id: number;
  tenantId: number | null;
  role: string;
};

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly prisma: PrismaService,
    private readonly phasesService: PhasesService,
    private readonly milestonesService: MilestonesService,
    private readonly taskSchedulingService: TaskSchedulingService,
  ) {}

  private async getPhaseOrThrow(phaseId: number, tenantId: number) {
    const phase = await this.prisma.phase.findFirst({
      where: {
        id: phaseId,
        project: {
          tenantId,
        },
      },
      include: {
        project: true,
      },
    });

    if (!phase) {
      throw new NotFoundException('Phase introuvable.');
    }

    return phase;
  }

  private async syncParentTaskStatus(parentTaskId: number) {
    const subtasks = await this.prisma.task.findMany({
      where: { parentTaskId },
      select: { status: true },
    });

    if (!subtasks.length) {
      return;
    }

    const allDone = subtasks.every(
      (subtask) => subtask.status === TaskStatus.DONE,
    );

    await this.prisma.task.update({
      where: { id: parentTaskId },
      data: {
        status: allDone ? TaskStatus.DONE : TaskStatus.IN_PROGRESS,
      },
    });
  }

  private hasDateChanged(oldDate: Date | null, newDate: Date | null): boolean {
    if (!oldDate && !newDate) return false;
    if (!oldDate || !newDate) return true;
    return oldDate.getTime() !== newDate.getTime();
  }

  async create(createTaskDto: CreateTaskDto, user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException("L'utilisateur n'est lié à aucun tenant.");
    }

    const phase = await this.getPhaseOrThrow(
      createTaskDto.phaseId,
      user.tenantId,
    );

    const startDate = createTaskDto.startDate
      ? new Date(createTaskDto.startDate)
      : undefined;

    const endDate = createTaskDto.endDate
      ? new Date(createTaskDto.endDate)
      : undefined;

    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException(
        'La date de fin doit être supérieure ou égale à la date de début.',
      );
    }

    const parentTask = createTaskDto.parentTaskId
      ? await this.prisma.task.findFirst({
          where: {
            id: createTaskDto.parentTaskId,
            phase: {
              project: {
                tenantId: user.tenantId,
              },
            },
          },
        })
      : null;

    if (createTaskDto.parentTaskId && !parentTask) {
      throw new NotFoundException('Tâche parent introuvable.');
    }

    if (parentTask && parentTask.phaseId !== createTaskDto.phaseId) {
      throw new BadRequestException(
        'La sous-tâche doit appartenir à la même phase que la tâche parent.',
      );
    }

    if (parentTask && parentTask.parentTaskId) {
      throw new BadRequestException(
        "Impossible d'ajouter une sous-tâche à une sous-tâche.",
      );
    }

    const createdTask = await this.tasksRepository.create({
      name: createTaskDto.name,
      description: createTaskDto.description,
      startDate,
      endDate,
      baselineStartDate: startDate,
      baselineEndDate: endDate,
      status: createTaskDto.status ?? TaskStatus.TODO,
      priority: createTaskDto.priority ?? TaskPriority.MEDIUM,
      order: createTaskDto.order,
      phase: {
        connect: { id: phase.id },
      },
      ...(createTaskDto.parentTaskId
        ? {
            parentTask: {
              connect: { id: createTaskDto.parentTaskId },
            },
          }
        : {}),
    });

    if (createdTask.parentTaskId) {
      await this.syncParentTaskStatus(createdTask.parentTaskId);
    }

    await this.phasesService.syncPhaseStatusFromTasks(createdTask.phaseId);
    await this.taskSchedulingService.refreshPhaseDatesFromTasks(
      createdTask.phaseId,
    );
    await this.taskSchedulingService.refreshProjectDatesFromPhases(
      phase.projectId,
    );

    return createdTask;
  }

  async findByPhase(phaseId: number, user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException("L'utilisateur n'est lié à aucun tenant.");
    }

    await this.getPhaseOrThrow(phaseId, user.tenantId);
    return this.tasksRepository.findByPhase(phaseId);
  }

  async findOne(id: number, user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException("L'utilisateur n'est lié à aucun tenant.");
    }

    const task = await this.prisma.task.findFirst({
      where: {
        id,
        phase: {
          project: {
            tenantId: user.tenantId,
          },
        },
      },
      include: {
        phase: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Tâche introuvable.');
    }

    return task;
  }

  async update(id: number, updateTaskDto: UpdateTaskDto, user: CurrentUser) {
    const task = await this.findOne(id, user);

    const oldParentTaskId = task.parentTaskId ?? null;
    const oldPhaseId = task.phaseId;
    const oldProjectId = task.phase.projectId;
    const oldMilestoneId = task.milestoneId ?? null;

    const data: any = {};

    if (updateTaskDto.name !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.name = updateTaskDto.name;
    }

    if (updateTaskDto.description !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.description = updateTaskDto.description;
    }

    if (updateTaskDto.status !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.status = updateTaskDto.status;
    }

    if (updateTaskDto.priority !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.priority = updateTaskDto.priority;
    }

    if (updateTaskDto.order !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.order = updateTaskDto.order;
    }

    if (updateTaskDto.startDate !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.startDate = updateTaskDto.startDate
        ? new Date(updateTaskDto.startDate)
        : null;
    }

    if (updateTaskDto.endDate !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.endDate = updateTaskDto.endDate
        ? new Date(updateTaskDto.endDate)
        : null;
    }

    const finalStart =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.startDate !== undefined ? data.startDate : task.startDate;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const finalEnd = data.endDate !== undefined ? data.endDate : task.endDate;

    if (finalStart && finalEnd && finalEnd < finalStart) {
      throw new BadRequestException(
        'La date de fin doit être supérieure ou égale à la date de début.',
      );
    }

    if (updateTaskDto.parentTaskId !== undefined) {
      if (updateTaskDto.parentTaskId === null) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        data.parentTask = { disconnect: true };
      } else {
        const parentTask = await this.prisma.task.findFirst({
          where: {
            id: updateTaskDto.parentTaskId,
            phase: {
              project: {
                tenantId: user.tenantId as number,
              },
            },
          },
        });

        if (!parentTask) {
          throw new NotFoundException('Tâche parent introuvable.');
        }

        if (parentTask.id === task.id) {
          throw new BadRequestException(
            'Une tâche ne peut pas être son propre parent.',
          );
        }

        if (parentTask.phaseId !== task.phaseId) {
          throw new BadRequestException(
            'La sous-tâche doit appartenir à la même phase que la tâche parent.',
          );
        }

        if (parentTask.parentTaskId) {
          throw new BadRequestException(
            "Impossible d'affecter une sous-tâche comme parent.",
          );
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        data.parentTask = {
          connect: { id: updateTaskDto.parentTaskId },
        };
      }
    }

    if (updateTaskDto.milestoneId !== undefined) {
      if (updateTaskDto.milestoneId === null) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        data.milestone = { disconnect: true };
      } else {
        const milestone = await this.prisma.milestone.findFirst({
          where: {
            id: updateTaskDto.milestoneId,
            project: {
              tenantId: user.tenantId as number,
            },
          },
        });

        if (!milestone) {
          throw new NotFoundException('Jalon introuvable.');
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        data.milestone = {
          connect: { id: updateTaskDto.milestoneId },
        };
      }
    }

    const startDateChanged =
      updateTaskDto.startDate !== undefined &&
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      this.hasDateChanged(task.startDate, data.startDate ?? null);

    const endDateChanged =
      updateTaskDto.endDate !== undefined &&
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      this.hasDateChanged(task.endDate, data.endDate ?? null);

    const datesChanged = startDateChanged || endDateChanged;

    const updatedTask = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: task.id },
        data,
        include: {
          phase: {
            include: {
              project: true,
            },
          },
        },
      });

      if (startDateChanged && updated.startDate) {
        await tx.materialAssignment.updateMany({
          where: { taskId: task.id },
          data: {
            startDate: updated.startDate,
          },
        });

        await tx.employeeAssignment.updateMany({
          where: { taskId: task.id },
          data: {
            startDate: updated.startDate,
          },
        });

        await tx.equipmentAssignment.updateMany({
          where: { taskId: task.id },
          data: {
            startDate: updated.startDate,
          },
        });
      }

      if (endDateChanged && updated.endDate) {
        await tx.employeeAssignment.updateMany({
          where: { taskId: task.id },
          data: {
            endDate: updated.endDate,
          },
        });

        await tx.equipmentAssignment.updateMany({
          where: { taskId: task.id },
          data: {
            endDate: updated.endDate,
          },
        });
      }

      return updated;
    });

    if (datesChanged) {
      await this.taskSchedulingService.rescheduleFromTask(updatedTask.id);
    } else {
      await this.taskSchedulingService.refreshPhaseDatesFromTasks(oldPhaseId);
      await this.taskSchedulingService.refreshProjectDatesFromPhases(
        oldProjectId,
      );
    }

    if (oldParentTaskId) {
      await this.syncParentTaskStatus(oldParentTaskId);
    }

    if (
      updatedTask.parentTaskId &&
      updatedTask.parentTaskId !== oldParentTaskId
    ) {
      await this.syncParentTaskStatus(updatedTask.parentTaskId);
    }

    if (
      updatedTask.parentTaskId &&
      updatedTask.parentTaskId === oldParentTaskId
    ) {
      await this.syncParentTaskStatus(updatedTask.parentTaskId);
    }

    await this.phasesService.syncPhaseStatusFromTasks(oldPhaseId);

    if (updatedTask.phaseId !== oldPhaseId) {
      await this.phasesService.syncPhaseStatusFromTasks(updatedTask.phaseId);
      await this.taskSchedulingService.refreshPhaseDatesFromTasks(
        updatedTask.phaseId,
      );
      await this.taskSchedulingService.refreshProjectDatesFromPhases(
        updatedTask.phase.projectId,
      );
    }

    if (oldMilestoneId) {
      await this.milestonesService.refreshMilestoneStatusFromTasks(
        oldMilestoneId,
      );
    }

    if (updatedTask.milestoneId && updatedTask.milestoneId !== oldMilestoneId) {
      await this.milestonesService.refreshMilestoneStatusFromTasks(
        updatedTask.milestoneId,
      );
    }

    return this.findOne(updatedTask.id, user);
  }

  async remove(id: number, user: CurrentUser) {
    const task = await this.findOne(id, user);

    const parentTaskId = task.parentTaskId ?? null;
    const phaseId = task.phaseId;
    const projectId = task.phase.projectId;
    const milestoneId = task.milestoneId ?? null;

    const deletedTask = await this.tasksRepository.delete(task.id);

    if (parentTaskId) {
      await this.syncParentTaskStatus(parentTaskId);
    }

    await this.phasesService.syncPhaseStatusFromTasks(phaseId);
    await this.taskSchedulingService.refreshPhaseDatesFromTasks(phaseId);
    await this.taskSchedulingService.refreshProjectDatesFromPhases(projectId);

    if (milestoneId) {
      await this.milestonesService.refreshMilestoneStatusFromTasks(milestoneId);
    }

    return deletedTask;
  }

  async findByProject(projectId: number, user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException("L'utilisateur n'est lié à aucun tenant.");
    }

    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        tenantId: user.tenantId,
      },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable.');
    }

    return this.tasksRepository.findByProject(projectId);
  }
}
