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
  async getProjectTracking(projectId: number) {
    const project =
      await this.projectsRepository.findProjectTracking(projectId);

    if (!project) {
      throw new NotFoundException('Projet introuvable.');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getIsLate = (status: string, endDate?: Date | null) => {
      if (status === 'DONE') return false;
      if (status === 'OVERDUE') return true;
      if (!endDate) return false;

      return new Date(endDate) < today;
    };

    const getDaysLate = (status: string, endDate?: Date | null) => {
      const isLate = getIsLate(status, endDate);

      if (!isLate || !endDate) return 0;

      return Math.ceil(
        (today.getTime() - new Date(endDate).getTime()) / (1000 * 60 * 60 * 24),
      );
    };

    const getTaskProgress = (task: any) => {
      const subtasks = task.subtasks ?? [];

      if (subtasks.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const completedSubtasks = subtasks.filter(
          (subtask) => subtask.status === 'DONE',
        ).length;

        return Math.round((completedSubtasks / subtasks.length) * 100);
      }

      if (task.status === 'DONE') return 100;
      if (task.status === 'IN_PROGRESS') return 50;
      if (task.status === 'BLOCKED') return 25;
      if (task.status === 'OVERDUE') return 20;

      return 0;
    };

    const tasks = project.phases.flatMap((phase) =>
      phase.tasks.map((task) => {
        const subtasks = task.subtasks ?? [];
        const allAnomalies = [
          ...(task.anomalies ?? []),
          ...subtasks.flatMap((subtask) => subtask.anomalies ?? []),
        ];

        const openAnomalies = allAnomalies.filter(
          (anomaly) => anomaly.status === 'OPEN',
        );

        const resolvedAnomalies = allAnomalies.filter(
          (anomaly) => anomaly.status === 'RESOLVED',
        );

        const isLate = getIsLate(task.status, task.endDate);
        const daysLate = getDaysLate(task.status, task.endDate);

        const completedSubtasks = subtasks.filter(
          (subtask) => subtask.status === 'DONE',
        ).length;

        return {
          id: task.id,
          name: task.name,
          description: task.description,
          phaseId: phase.id,
          phaseName: phase.name,
          status: task.status,
          priority: task.priority,
          startDate: task.startDate,
          endDate: task.endDate,
          updatedAt: task.updatedAt,
          progress: getTaskProgress(task),
          isLate,
          daysLate,
          totalSubtasks: subtasks.length,
          completedSubtasks,
          anomaliesCount: allAnomalies.length,
          openAnomaliesCount: openAnomalies.length,
          resolvedAnomaliesCount: resolvedAnomalies.length,
          criticalOpenAnomaliesCount: openAnomalies.filter(
            (anomaly) =>
              anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH',
          ).length,
        };
      }),
    );

    const anomalies = project.phases.flatMap((phase) =>
      phase.tasks.flatMap((task) => {
        const taskAnomalies = (task.anomalies ?? []).map((anomaly) => ({
          id: anomaly.id,
          title: anomaly.title,
          description: anomaly.description,
          severity: anomaly.severity,
          status: anomaly.status,
          photoUrls: anomaly.photoUrls,
          taskId: task.id,
          taskName: task.name,
          subtaskId: null,
          subtaskName: null,
          phaseId: phase.id,
          phaseName: phase.name,
          declaredAt: anomaly.createdAt,
          resolvedAt: anomaly.status === 'RESOLVED' ? anomaly.updatedAt : null,
        }));

        const subtaskAnomalies = (task.subtasks ?? []).flatMap((subtask) =>
          (subtask.anomalies ?? []).map((anomaly) => ({
            id: anomaly.id,
            title: anomaly.title,
            description: anomaly.description,
            severity: anomaly.severity,
            status: anomaly.status,
            photoUrls: anomaly.photoUrls,
            taskId: task.id,
            taskName: task.name,
            subtaskId: subtask.id,
            subtaskName: subtask.name,
            phaseId: phase.id,
            phaseName: phase.name,
            declaredAt: anomaly.createdAt,
            resolvedAt:
              anomaly.status === 'RESOLVED' ? anomaly.updatedAt : null,
          })),
        );

        return [...taskAnomalies, ...subtaskAnomalies];
      }),
    );

    const phasesTracking = project.phases.map((phase) => {
      const phaseTasks = phase.tasks ?? [];

      const phaseTaskItems = phaseTasks.map((task) => {
        const subtasks = task.subtasks ?? [];

        const completedSubtasks = subtasks.filter(
          (subtask) => subtask.status === 'DONE',
        ).length;

        const taskProgress = getTaskProgress(task);

        const taskAnomalies = [
          ...(task.anomalies ?? []),
          ...subtasks.flatMap((subtask) => subtask.anomalies ?? []),
        ];

        const openAnomalies = taskAnomalies.filter(
          (anomaly) => anomaly.status === 'OPEN',
        );

        const resolvedAnomalies = taskAnomalies.filter(
          (anomaly) => anomaly.status === 'RESOLVED',
        );

        return {
          id: task.id,
          name: task.name,
          description: task.description,
          status: task.status,
          priority: task.priority,
          startDate: task.startDate,
          endDate: task.endDate,
          progress: taskProgress,
          isLate: getIsLate(task.status, task.endDate),
          daysLate: getDaysLate(task.status, task.endDate),
          totalSubtasks: subtasks.length,
          completedSubtasks,
          openAnomalies: openAnomalies.length,
          resolvedAnomalies: resolvedAnomalies.length,
          criticalAnomalies: openAnomalies.filter(
            (anomaly) =>
              anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH',
          ).length,
          subtasks: subtasks.map((subtask) => ({
            id: subtask.id,
            name: subtask.name,
            status: subtask.status,
            priority: subtask.priority,
            startDate: subtask.startDate,
            endDate: subtask.endDate,
            isLate: getIsLate(subtask.status, subtask.endDate),
            daysLate: getDaysLate(subtask.status, subtask.endDate),
            anomaliesCount: (subtask.anomalies ?? []).length,
            openAnomaliesCount: (subtask.anomalies ?? []).filter(
              (anomaly) => anomaly.status === 'OPEN',
            ).length,
            resolvedAnomaliesCount: (subtask.anomalies ?? []).filter(
              (anomaly) => anomaly.status === 'RESOLVED',
            ).length,
          })),
        };
      });

      const phaseProgress =
        phaseTaskItems.length > 0
          ? Math.round(
              phaseTaskItems.reduce((sum, task) => sum + task.progress, 0) /
                phaseTaskItems.length,
            )
          : 0;

      return {
        id: phase.id,
        name: phase.name,
        status: phase.status,
        progress: phaseProgress,
        totalTasks: phaseTaskItems.length,
        completedTasks: phaseTaskItems.filter((task) => task.progress === 100)
          .length,
        openAnomalies: phaseTaskItems.reduce(
          (sum, task) => sum + task.openAnomalies,
          0,
        ),
        resolvedAnomalies: phaseTaskItems.reduce(
          (sum, task) => sum + task.resolvedAnomalies,
          0,
        ),
        criticalAnomalies: phaseTaskItems.reduce(
          (sum, task) => sum + task.criticalAnomalies,
          0,
        ),
        lateTasks: phaseTaskItems.filter((task) => task.isLate).length,
        tasks: phaseTaskItems,
      };
    });

    const phasesProgress = phasesTracking.map((phase) => ({
      id: phase.id,
      name: phase.name,
      status: phase.status,
      totalTasks: phase.totalTasks,
      completedTasks: phase.completedTasks,
      progress: phase.progress,
      openAnomalies: phase.openAnomalies,
      resolvedAnomalies: phase.resolvedAnomalies,
      criticalAnomalies: phase.criticalAnomalies,
      lateTasks: phase.lateTasks,
    }));

    const completedTasks = tasks.filter((task) => task.progress === 100).length;

    return {
      project: {
        id: project.id,
        name: project.name,
        code: project.code,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
      },

      summary: {
        totalTasks: tasks.length,
        completedTasks,
        progress:
          tasks.length > 0
            ? Math.round(
                tasks.reduce((sum, task) => sum + task.progress, 0) /
                  tasks.length,
              )
            : 0,
        tasksWithAnomalies: tasks.filter((task) => task.anomaliesCount > 0)
          .length,
        lateTasks: tasks.filter((task) => task.isLate).length,
        totalAnomalies: anomalies.length,
        openAnomalies: anomalies.filter((anomaly) => anomaly.status === 'OPEN')
          .length,
        resolvedAnomalies: anomalies.filter(
          (anomaly) => anomaly.status === 'RESOLVED',
        ).length,
        criticalOpenAnomalies: anomalies.filter(
          (anomaly) =>
            anomaly.status === 'OPEN' &&
            (anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH'),
        ).length,
      },

      phasesProgress,
      phasesTracking,
      taskProgress: tasks,
      anomalies,
    };
  }
}
