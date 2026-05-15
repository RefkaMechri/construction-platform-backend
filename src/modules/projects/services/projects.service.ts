/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PhaseStatus, ProjectStatus, TaskStatus } from '@prisma/client';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ProjectsRepository } from '../repositories/projects.repository';
import { NotificationsService } from 'src/modules/Notification/services/notifications.service';
import { NotificationSeverityEnum } from 'src/modules/Notification/types/notification.types';
import {
  NotificationSourceType,
  NotificationType,
} from 'src/modules/deadlines/types/deadline-source.type';
type CurrentUser = {
  id: number;
  tenantId: number | null;
  role: string;
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  private generateProjectCode(sequence: number): string {
    return `PRJ-${String(sequence).padStart(3, '0')}`;
  }

  private validateProjectSurface(
    siteArea?: number | null,
    builtArea?: number | null,
    floorsCount?: number | null,
  ) {
    if (
      siteArea !== undefined &&
      siteArea !== null &&
      builtArea !== undefined &&
      builtArea !== null &&
      floorsCount !== undefined &&
      floorsCount !== null &&
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

    if (!createProjectDto.siteManagerId) {
      throw new BadRequestException('Le responsable chantier est obligatoire.');
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

    const project = await this.projectsRepository.create({
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

      siteManager: {
        connect: { id: createProjectDto.siteManagerId },
      },
    });

    await this.notificationsService.createIfNotExists({
      userId: createProjectDto.siteManagerId,
      type: NotificationType.PROJECT_ASSIGNED_TO_SITE_MANAGER,
      title: 'Nouveau projet assigné',
      message: `Vous avez été assigné comme conducteur de travaux au projet "${project.name}".`,
      severity: NotificationSeverityEnum.INFO,
      sourceType: NotificationSourceType.PROJECT,
      sourceId: project.id,
    });

    return project;
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
      siteManagerName: project.siteManager?.name,
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

    if (updateProjectDto.name !== undefined) {
      data.name = updateProjectDto.name;
    }

    if (updateProjectDto.client !== undefined) {
      data.client = updateProjectDto.client;
    }

    if (updateProjectDto.address !== undefined) {
      data.address = updateProjectDto.address;
    }

    if (updateProjectDto.siteArea !== undefined) {
      data.siteArea = updateProjectDto.siteArea;
    }

    if (updateProjectDto.builtArea !== undefined) {
      data.builtArea = updateProjectDto.builtArea;
    }

    if (updateProjectDto.floorsCount !== undefined) {
      data.floorsCount = updateProjectDto.floorsCount;
    }

    if (updateProjectDto.description !== undefined) {
      data.description = updateProjectDto.description;
    }

    if (updateProjectDto.status !== undefined) {
      data.status = updateProjectDto.status;
    }

    if (updateProjectDto.type !== undefined) {
      data.type = updateProjectDto.type;
    }

    if (updateProjectDto.budget !== undefined) {
      data.budget = updateProjectDto.budget;
    }

    if (updateProjectDto.startDate !== undefined) {
      const startDate = new Date(updateProjectDto.startDate);

      data.startDate = startDate;
      data.baselineStartDate = startDate;
    }

    if (updateProjectDto.endDate !== undefined) {
      const endDate = new Date(updateProjectDto.endDate);

      data.endDate = endDate;
      data.baselineEndDate = endDate;
    }

    if (updateProjectDto.siteManagerId !== undefined) {
      if (!updateProjectDto.siteManagerId) {
        throw new BadRequestException(
          'Le responsable chantier est obligatoire.',
        );
      }

      data.siteManager = {
        connect: { id: updateProjectDto.siteManagerId },
      };
    }

    const finalSiteArea = data.siteArea ?? project.siteArea;
    const finalBuiltArea = data.builtArea ?? project.builtArea;
    const finalFloorsCount = data.floorsCount ?? project.floorsCount;

    this.validateProjectSurface(
      finalSiteArea,
      finalBuiltArea,
      finalFloorsCount,
    );

    const finalStartDate = data.startDate ?? project.startDate;
    const finalEndDate = data.endDate ?? project.endDate;

    if (finalStartDate && finalEndDate && finalEndDate < finalStartDate) {
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
  /**site manager */
  async getAssignedProjects(currentUser: any) {
    this.ensureSiteManager(currentUser);

    const projects = await this.projectsRepository.findAssignedProjects(
      Number(currentUser.id),
    );

    return projects.map((project) => ({
      ...project,
      budget: project.budget.toString(),
    }));
  }

  async getAssignedProjectById(id: number, user: any) {
    this.ensureSiteManager(user);

    const project = await this.projectsRepository.findAssignedProjectDetails(
      id,
      Number(user.id),
    );

    if (!project) {
      throw new NotFoundException(
        'Projet introuvable ou non assigné à ce conducteur de travaux.',
      );
    }

    return {
      ...project,
      budget: project.budget.toString(),
    };
  }

  private ensureSiteManager(currentUser: any) {
    if (!currentUser) {
      throw new ForbiddenException('Utilisateur non authentifié.');
    }
  }
  async updateAssignedProjectTaskStatus(
    projectId: number,
    taskId: number,
    status: TaskStatus,
    user: any,
  ) {
    this.ensureSiteManager(user);

    const task = await this.projectsRepository.findTaskInAssignedProject(
      projectId,
      taskId,
      Number(user.id),
    );

    if (!task) {
      throw new NotFoundException(
        'Tâche introuvable ou non liée à un projet assigné à ce conducteur de travaux.',
      );
    }

    const allowedStatuses: TaskStatus[] = [
      TaskStatus.TODO,
      TaskStatus.IN_PROGRESS,
      TaskStatus.DONE,
      TaskStatus.BLOCKED,
      TaskStatus.OVERDUE,
    ];

    if (!allowedStatuses.includes(status)) {
      throw new ForbiddenException('Statut de tâche non autorisé.');
    }

    return this.projectsRepository.updateTaskStatus(taskId, status);
  }
}
