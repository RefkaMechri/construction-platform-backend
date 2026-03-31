import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
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

    const count = await this.projectsRepository.countByTenant(user.tenantId);
    const code = this.generateProjectCode(count + 1);

    return this.projectsRepository.create({
      name: createProjectDto.name,
      code,
      client: createProjectDto.client,
      address: createProjectDto.address,
      startDate,
      endDate,
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

    return project;
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
      data.startDate = new Date(updateProjectDto.startDate);
    if (updateProjectDto.endDate !== undefined)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data.endDate = new Date(updateProjectDto.endDate);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
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
}
