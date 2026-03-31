import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TaskDependencyType } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreateTaskDependencyDto } from '../dto/create-task-dependency.dto';
import { TaskDependenciesRepository } from '../repositories/task-dependencies.repository';

type CurrentUser = {
  tenantId: number | null;
};

@Injectable()
export class TaskDependenciesService {
  constructor(
    private readonly taskDependenciesRepository: TaskDependenciesRepository,
    private readonly prisma: PrismaService,
  ) {}

  private async getTaskOrThrow(taskId: number, tenantId: number) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        phase: {
          project: {
            tenantId,
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
      throw new NotFoundException(`Tâche ${taskId} introuvable.`);
    }

    return task;
  }

  async create(dto: CreateTaskDependencyDto, user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException("L'utilisateur n'est lié à aucun tenant.");
    }

    if (dto.predecessorTaskId === dto.successorTaskId) {
      throw new BadRequestException(
        'Une tâche ne peut pas dépendre d’elle-même.',
      );
    }

    const predecessor = await this.getTaskOrThrow(
      dto.predecessorTaskId,
      user.tenantId,
    );
    const successor = await this.getTaskOrThrow(
      dto.successorTaskId,
      user.tenantId,
    );

    if (predecessor.phase.projectId !== successor.phase.projectId) {
      throw new BadRequestException(
        'Les deux tâches doivent appartenir au même projet.',
      );
    }

    const existing = await this.prisma.taskDependency.findUnique({
      where: {
        predecessorTaskId_successorTaskId: {
          predecessorTaskId: dto.predecessorTaskId,
          successorTaskId: dto.successorTaskId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Cette dépendance existe déjà.');
    }

    return this.taskDependenciesRepository.create({
      type: dto.type ?? TaskDependencyType.FINISH_TO_START,
      lagDays: dto.lagDays ?? 0,
      predecessorTask: {
        connect: { id: dto.predecessorTaskId },
      },
      successorTask: {
        connect: { id: dto.successorTaskId },
      },
    });
  }

  async findByTask(taskId: number, user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException("L'utilisateur n'est lié à aucun tenant.");
    }

    await this.getTaskOrThrow(taskId, user.tenantId);

    return this.taskDependenciesRepository.findByTask(taskId);
  }

  async remove(id: number, user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException("L'utilisateur n'est lié à aucun tenant.");
    }

    const dependency = await this.prisma.taskDependency.findFirst({
      where: {
        id,
        predecessorTask: {
          phase: {
            project: {
              tenantId: user.tenantId,
            },
          },
        },
      },
    });

    if (!dependency) {
      throw new NotFoundException('Dépendance introuvable.');
    }

    return this.taskDependenciesRepository.delete(id);
  }
}
