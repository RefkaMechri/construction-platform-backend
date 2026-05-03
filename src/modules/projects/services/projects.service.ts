/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PhaseStatus, ProjectStatus } from '@prisma/client';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ProjectsRepository } from '../repositories/projects.repository';

type CurrentUser = {
  id: number;
  tenantId: number | null;
  role: string;
};

@Injectable()
export class ProjectsService {
  constructor(private readonly projectsRepository: ProjectsRepository) {}

  private generateProjectCode(sequence: number): string {
    return `PRJ-${String(sequence).padStart(3, '0')}`;
  }

  private validateProjectSurface(
    siteArea?: number,
    builtArea?: number,
    floorsCount?: number,
  ) {
    if (
      siteArea !== undefined &&
      builtArea !== undefined &&
      floorsCount !== undefined &&
      builtArea > siteArea * floorsCount
    ) {
      throw new BadRequestException(
        'La surface construite ne peut pas dépasser surface terrain × nombre d’étages.',
      );
    }
  }

  async create(createProjectDto: CreateProjectDto, user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException("L'utilisateur n'est lié à aucun tenant.");
    }

    const startDate = new Date(createProjectDto.startDate);
    const endDate = new Date(createProjectDto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException(
        'La date de fin doit être supérieure ou égale à la date de début.',
      );
    }

    this.validateProjectSurface(
      createProjectDto.siteArea,
      createProjectDto.builtArea,
      createProjectDto.floorsCount,
    );

    const count = await this.projectsRepository.countByTenant(user.tenantId);
    const code = this.generateProjectCode(count + 1);

    return this.projectsRepository.create({
      name: createProjectDto.name,
      code,
      client: createProjectDto.client,
      address: createProjectDto.address,

      siteArea: createProjectDto.siteArea,
      builtArea: createProjectDto.builtArea,
      floorsCount: createProjectDto.floorsCount,

      startDate,
      endDate,
      baselineStartDate: startDate,
      baselineEndDate: endDate,
      budget: createProjectDto.budget,
      type: createProjectDto.type,
      description: createProjectDto.description,
      status: createProjectDto.status ?? ProjectStatus.BROUILLON,
      tenant: {
        connect: { id: user.tenantId },
      },
      projectManager: {
        connect: { id: user.id },
      },
    });
  }

  async findAll(user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException("L'utilisateur n'est lié à aucun tenant.");
    }

    return this.projectsRepository.findAllByTenant(user.tenantId);
  }

  async findOne(id: number, user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException("L'utilisateur n'est lié à aucun tenant.");
    }

    const project = await this.projectsRepository.findByIdAndTenant(
      id,
      user.tenantId,
    );

    if (!project) {
      throw new NotFoundException('Projet introuvable.');
    }

    return {
      ...project,
      projectManagerName: project.projectManager?.name,
      totalBudget: project.budgetDetails?.totalBudget ?? 0,
    };
  }

  async update(
    id: number,
    updateProjectDto: UpdateProjectDto,
    user: CurrentUser,
  ) {
    const project = await this.findOne(id, user);

    const data: any = {};

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (updateProjectDto.name !== undefined) data.name = updateProjectDto.name;

    if (updateProjectDto.client !== undefined)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.client = updateProjectDto.client;

    if (updateProjectDto.address !== undefined)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.address = updateProjectDto.address;

    if (updateProjectDto.siteArea !== undefined)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.siteArea = updateProjectDto.siteArea;

    if (updateProjectDto.builtArea !== undefined)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.builtArea = updateProjectDto.builtArea;

    if (updateProjectDto.floorsCount !== undefined)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.floorsCount = updateProjectDto.floorsCount;

    if (updateProjectDto.description !== undefined)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.description = updateProjectDto.description;

    if (updateProjectDto.status !== undefined)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.status = updateProjectDto.status;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (updateProjectDto.type !== undefined) data.type = updateProjectDto.type;

    if (updateProjectDto.budget !== undefined)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.budget = updateProjectDto.budget;

    if (updateProjectDto.startDate !== undefined)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.baselineStartDate = new Date(updateProjectDto.startDate);

    if (updateProjectDto.endDate !== undefined)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.baselineEndDate = new Date(updateProjectDto.endDate);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const finalSiteArea = data.siteArea ?? project.siteArea;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const finalBuiltArea = data.builtArea ?? project.builtArea;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const finalFloorsCount = data.floorsCount ?? project.floorsCount;

    this.validateProjectSurface(
      finalSiteArea,
      finalBuiltArea,
      finalFloorsCount,
    );

    if (
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.baselineStartDate &&
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.baselineEndDate &&
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.baselineEndDate < data.baselineStartDate
    ) {
      throw new BadRequestException(
        'La date de fin doit être supérieure ou égale à la date de début.',
      );
    }

    return this.projectsRepository.update(project.id, data);
  }

  async remove(id: number, user: CurrentUser) {
    const project = await this.findOne(id, user);
    return this.projectsRepository.delete(project.id);
  }

  async refreshProjectStatus(projectId: number): Promise<void> {
    const project = await this.projectsRepository.findByIdWithPhases(projectId);

    if (!project) {
      throw new NotFoundException('Projet introuvable.');
    }

    if (project.status === ProjectStatus.ANNULE) {
      return;
    }

    const phases = project.phases ?? [];

    if (phases.length === 0) {
      return;
    }

    const allCompleted = phases.every(
      (phase) => phase.status === PhaseStatus.COMPLETED,
    );

    if (allCompleted && project.status !== ProjectStatus.TERMINE) {
      await this.projectsRepository.update(projectId, {
        status: ProjectStatus.TERMINE,
      });
      return;
    }

    if (!allCompleted && project.status === ProjectStatus.TERMINE) {
      await this.projectsRepository.update(projectId, {
        status: ProjectStatus.EN_COURS,
      });
    }
  }
}
