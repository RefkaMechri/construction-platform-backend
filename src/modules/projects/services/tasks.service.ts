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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.tasksRepository.create({
      name: createTaskDto.name,
      description: createTaskDto.description,
      startDate,
      endDate,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      status: createTaskDto.status ?? TaskStatus.TODO,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      priority: createTaskDto.priority ?? TaskPriority.MEDIUM,
      order: createTaskDto.order,
      phase: {
        connect: { id: phase.id },
      },
    });
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return task;
  }

  async update(id: number, updateTaskDto: UpdateTaskDto, user: CurrentUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const task = await this.findOne(id, user);

    const data: any = {};

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    if (updateTaskDto.name !== undefined) data.name = updateTaskDto.name;
    if (updateTaskDto.description !== undefined)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      data.description = updateTaskDto.description;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    if (updateTaskDto.status !== undefined) data.status = updateTaskDto.status;
    if (updateTaskDto.priority !== undefined)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      data.priority = updateTaskDto.priority;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    if (updateTaskDto.order !== undefined) data.order = updateTaskDto.order;

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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.tasksRepository.update(task.id, data);
  }

  async remove(id: number, user: CurrentUser) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const task = await this.findOne(id, user);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.tasksRepository.delete(task.id);
  }
}
