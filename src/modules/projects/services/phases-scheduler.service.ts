import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PhaseStatus } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { ProjectsService } from './projects.service';

@Injectable()
export class PhasesSchedulerService {
  private readonly logger = new Logger(PhasesSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
  ) {}

  @Cron('0 0 0 * * *') // chaque jour à minuit
  async markOverduePhases() {
    const now = new Date();

    const overduePhases = await this.prisma.phase.findMany({
      where: {
        endDate: { lt: now },
        status: {
          in: [
            PhaseStatus.NOT_STARTED,
            PhaseStatus.IN_PROGRESS,
            PhaseStatus.ON_HOLD,
          ],
        },
      },
      select: {
        id: true,
        projectId: true,
      },
    });

    if (overduePhases.length === 0) {
      this.logger.log('Aucune phase en retard.');
      return;
    }

    await this.prisma.phase.updateMany({
      where: {
        id: {
          in: overduePhases.map((phase) => phase.id),
        },
      },
      data: {
        status: PhaseStatus.OVERDUE,
      },
    });

    const projectIds = [
      ...new Set(overduePhases.map((phase) => phase.projectId)),
    ];

    for (const projectId of projectIds) {
      await this.projectsService.refreshProjectStatus(projectId);
    }

    this.logger.log(`${overduePhases.length} phase(s) mises en retard.`);
  }
}
