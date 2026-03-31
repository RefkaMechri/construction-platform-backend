import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PhaseStatus } from '@prisma/client';
import { CreatePhaseDto } from '../dto/create-phase.dto';
import { UpdatePhaseDto } from '../dto/update-phase.dto';
import { PhasesRepository } from '../repositories/phases.repository';
import { PrismaService } from 'prisma/prisma.service';

type CurrentUser = {
  id: number;
  tenantId: number | null;
  role: string;
};

@Injectable()
export class PhasesService {
  constructor(
    private readonly phasesRepository: PhasesRepository,
    private readonly prisma: PrismaService,
  ) {}

  private async getProjectOrThrow(projectId: number, tenantId: number) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        tenantId,
      },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable.');
    }

    return project;
  }

  async create(createPhaseDto: CreatePhaseDto, user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException("L'utilisateur n'est lié à aucun tenant.");
    }

    const project = await this.getProjectOrThrow(
      createPhaseDto.projectId,
      user.tenantId,
    );

    const startDate = createPhaseDto.startDate
      ? new Date(createPhaseDto.startDate)
      : undefined;

    const endDate = createPhaseDto.endDate
      ? new Date(createPhaseDto.endDate)
      : undefined;

    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException(
        'La date de fin doit être supérieure ou égale à la date de début.',
      );
    }

    return this.phasesRepository.create({
      name: createPhaseDto.name,
      description: createPhaseDto.description,
      startDate,
      endDate,
      status: createPhaseDto.status ?? PhaseStatus.NOT_STARTED,
      order: createPhaseDto.order,
      project: {
        connect: { id: project.id },
      },
    });
  }

  async findByProject(projectId: number, user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException("L'utilisateur n'est lié à aucun tenant.");
    }

    await this.getProjectOrThrow(projectId, user.tenantId);

    return this.phasesRepository.findByProject(projectId);
  }

  async findOne(id: number, user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException("L'utilisateur n'est lié à aucun tenant.");
    }

    const phase = await this.prisma.phase.findFirst({
      where: {
        id,
        project: {
          tenantId: user.tenantId,
        },
      },
    });

    if (!phase) {
      throw new NotFoundException('Phase introuvable.');
    }

    return phase;
  }

  async update(id: number, updatePhaseDto: UpdatePhaseDto, user: CurrentUser) {
    const phase = await this.findOne(id, user);

    const data: any = {};

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (updatePhaseDto.name !== undefined) data.name = updatePhaseDto.name;
    if (updatePhaseDto.description !== undefined)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.description = updatePhaseDto.description;
    if (updatePhaseDto.status !== undefined)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.status = updatePhaseDto.status;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (updatePhaseDto.order !== undefined) data.order = updatePhaseDto.order;
    if (updatePhaseDto.startDate !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.startDate = updatePhaseDto.startDate
        ? new Date(updatePhaseDto.startDate)
        : null;
    }
    if (updatePhaseDto.endDate !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.endDate = updatePhaseDto.endDate
        ? new Date(updatePhaseDto.endDate)
        : null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const finalStart = data.startDate ?? phase.startDate;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const finalEnd = data.endDate ?? phase.endDate;

    if (finalStart && finalEnd && finalEnd < finalStart) {
      throw new BadRequestException(
        'La date de fin doit être supérieure ou égale à la date de début.',
      );
    }

    return this.phasesRepository.update(phase.id, data);
  }

  async remove(id: number, user: CurrentUser) {
    const phase = await this.findOne(id, user);
    return this.phasesRepository.delete(phase.id);
  }
}
