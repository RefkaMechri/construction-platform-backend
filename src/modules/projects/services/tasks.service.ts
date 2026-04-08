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
        phase: true,
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const finalStart = data.startDate ?? task.startDate;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const finalEnd = data.endDate ?? task.endDate;

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

    const updatedTask = await this.tasksRepository.update(task.id, data);

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
    }
    if (task.milestoneId) {
      await this.milestonesService.refreshMilestoneStatusFromTasks(
        task.milestoneId,
      );
    }

    if (
      updatedTask.milestoneId &&
      updatedTask.milestoneId !== task.milestoneId
    ) {
      await this.milestonesService.refreshMilestoneStatusFromTasks(
        updatedTask.milestoneId,
      );
    }

    return updatedTask;
  }

  async remove(id: number, user: CurrentUser) {
    const task = await this.findOne(id, user);
    const parentTaskId = task.parentTaskId ?? null;
    const phaseId = task.phaseId;

    const deletedTask = await this.tasksRepository.delete(task.id);

    if (parentTaskId) {
      await this.syncParentTaskStatus(parentTaskId);
    }

    await this.phasesService.syncPhaseStatusFromTasks(phaseId);

    return deletedTask;
  }
}
