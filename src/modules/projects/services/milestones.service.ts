import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MilestoneStatus } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreateMilestoneDto } from '../dto/create-milestone.dto';
import { UpdateMilestoneDto } from '../dto/update-milestone.dto';
import { MilestonesRepository } from '../repositories/milestones.repository';
import { Cron } from '@nestjs/schedule';

type CurrentUser = {
  tenantId: number | null;
};

@Injectable()
export class MilestonesService {
  constructor(
    private readonly milestonesRepository: MilestonesRepository,
    private readonly prisma: PrismaService,
  ) {}

  private async getProjectOrThrow(projectId: number, tenantId: number) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable.');
    }

    return project;
  }

  private async validateTasksOrThrow(
    taskIds: number[] | undefined,
    projectId: number,
    tenantId: number,
  ) {
    if (!taskIds || taskIds.length === 0) {
      return;
    }

    const tasks = await this.prisma.task.findMany({
      where: {
        id: { in: taskIds },
        phase: {
          projectId,
          project: {
            tenantId,
          },
        },
      },
      select: { id: true },
    });

    if (tasks.length !== taskIds.length) {
      throw new BadRequestException(
        'Une ou plusieurs tâches sont introuvables ou n’appartiennent pas à ce projet.',
      );
    }
  }

  async create(dto: CreateMilestoneDto, user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException('Utilisateur sans tenant.');
    }

    await this.getProjectOrThrow(dto.projectId, user.tenantId);
    await this.validateTasksOrThrow(dto.taskIds, dto.projectId, user.tenantId);

    const milestone = await this.milestonesRepository.create({
      name: dto.name,
      description: dto.description,
      dueDate: new Date(dto.dueDate),
      status: dto.status ?? MilestoneStatus.UPCOMING,
      project: { connect: { id: dto.projectId } },
      tasks: dto.taskIds?.length
        ? {
            connect: dto.taskIds.map((id) => ({ id })),
          }
        : undefined,
    });

    await this.refreshMilestoneStatusFromTasks(milestone.id);

    return this.prisma.milestone.findUnique({
      where: { id: milestone.id },
      include: { tasks: true },
    });
  }

  findByProject(projectId: number) {
    return this.milestonesRepository.findByProject(projectId);
  }

  async update(id: number, dto: UpdateMilestoneDto, user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException('Utilisateur sans tenant.');
    }

    const existingMilestone = await this.prisma.milestone.findUnique({
      where: { id },
      select: {
        id: true,
        projectId: true,
        project: {
          select: {
            tenantId: true,
          },
        },
      },
    });

    if (
      !existingMilestone ||
      existingMilestone.project.tenantId !== user.tenantId
    ) {
      throw new NotFoundException('Milestone introuvable.');
    }

    if (dto.taskIds !== undefined) {
      await this.validateTasksOrThrow(
        dto.taskIds,
        existingMilestone.projectId,
        user.tenantId,
      );
    }

    const { taskIds, ...milestoneData } = dto;

    const milestone = await this.milestonesRepository.update(id, {
      ...milestoneData,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      tasks:
        taskIds !== undefined
          ? {
              set: taskIds.map((taskId) => ({ id: taskId })),
            }
          : undefined,
    });

    if (
      milestone.status !== MilestoneStatus.ACHIEVED &&
      milestone.status !== MilestoneStatus.CANCELLED
    ) {
      await this.refreshMilestoneStatusFromTasks(id);
    }

    return this.prisma.milestone.findUnique({
      where: { id },
      include: { tasks: true },
    });
  }

  async remove(id: number) {
    return this.milestonesRepository.delete(id);
  }
  async refreshMilestoneStatusFromTasks(milestoneId: number) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        tasks: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone introuvable.');
    }

    if (
      milestone.status === MilestoneStatus.ACHIEVED ||
      milestone.status === MilestoneStatus.CANCELLED
    ) {
      return milestone;
    }

    const hasTasks = milestone.tasks.length > 0;
    const allTasksDone =
      hasTasks && milestone.tasks.every((task) => task.status === 'DONE');

    return this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: allTasksDone
          ? MilestoneStatus.READY_FOR_VALIDATION
          : MilestoneStatus.UPCOMING,
      },
    });
  }
  async markOverdueMilestones() {
    const now = new Date();

    return this.prisma.milestone.updateMany({
      where: {
        dueDate: {
          lt: now,
        },
        status: {
          in: [MilestoneStatus.UPCOMING, MilestoneStatus.READY_FOR_VALIDATION],
        },
      },
      data: {
        status: MilestoneStatus.DELAYED,
      },
    });
  }

  @Cron('0 0 0 * * *', {
    timeZone: 'Africa/Tunis',
  })
  async handleOverdueMilestonesCron() {
    const result = await this.markOverdueMilestones();
    console.log(`${result.count} milestone(s) mis à jour en retard.`);
  }
}
