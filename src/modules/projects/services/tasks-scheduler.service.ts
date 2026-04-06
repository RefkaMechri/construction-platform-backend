import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'prisma/prisma.service';
import { TaskStatus } from '@prisma/client';
import { PhasesService } from '../../projects/services/phases.service';
import { ProjectsService } from '../../projects/services/projects.service';

@Injectable()
export class TasksSchedulerService {
  private readonly logger = new Logger(TasksSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly phasesService: PhasesService,
    private readonly projectsService: ProjectsService,
  ) {}

  @Cron('0 0 0 * * *') //tous les jours à minuit
  async markOverdueTasks() {
    const now = new Date();

    const overdueTasks = await this.prisma.task.findMany({
      where: {
        endDate: { lt: now },
        status: {
          in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
        },
      },
      select: {
        id: true,
        phaseId: true,
      },
    });

    if (overdueTasks.length === 0) {
      return;
    }

    await this.prisma.task.updateMany({
      where: {
        id: {
          in: overdueTasks.map((task) => task.id),
        },
      },
      data: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        status: TaskStatus.OVERDUE,
      },
    });

    const phaseIds = [...new Set(overdueTasks.map((task) => task.phaseId))];

    for (const phaseId of phaseIds) {
      const updatedPhase =
        await this.phasesService.syncPhaseStatusFromTasks(phaseId);

      if (updatedPhase) {
        await this.projectsService.refreshProjectStatus(updatedPhase.projectId);
      } else {
        const phase = await this.prisma.phase.findUnique({
          where: { id: phaseId },
          select: { projectId: true },
        });

        if (phase) {
          await this.projectsService.refreshProjectStatus(phase.projectId);
        }
      }
    }

    this.logger.log(`${overdueTasks.length} tâche(s) passées en retard.`);
  }
}
