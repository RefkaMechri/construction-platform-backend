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

  async create(dto: CreateMilestoneDto, user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException('Utilisateur sans tenant.');
    }

    await this.getProjectOrThrow(dto.projectId, user.tenantId);

    return this.milestonesRepository.create({
      name: dto.name,
      description: dto.description,
      dueDate: new Date(dto.dueDate),
      status: dto.status ?? MilestoneStatus.UPCOMING,
      project: { connect: { id: dto.projectId } },
      phase: dto.phaseId ? { connect: { id: dto.phaseId } } : undefined,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  findByProject(projectId: number, user: CurrentUser) {
    return this.milestonesRepository.findByProject(projectId);
  }

  async update(id: number, dto: UpdateMilestoneDto) {
    return this.milestonesRepository.update(id, {
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });
  }

  async remove(id: number) {
    return this.milestonesRepository.delete(id);
  }
}
