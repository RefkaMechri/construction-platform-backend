import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

type CurrentUser = {
  tenantId: number | null;
};

@Injectable()
export class GlobalTasksService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllTenantTasks(user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException("L'utilisateur n'est lié à aucun tenant.");
    }

    const tasks = await this.prisma.task.findMany({
      where: {
        phase: {
          project: {
            tenantId: user.tenantId,
          },
        },
      },
      include: {
        phase: {
          include: {
            project: true,
          },
        },
      },
      orderBy: [
        {
          phase: {
            project: {
              name: 'asc',
            },
          },
        },
        {
          phase: {
            name: 'asc',
          },
        },
        {
          startDate: 'asc',
        },
      ],
    });

    return tasks.map((task) => ({
      id: task.id,
      name: task.name,
      description: task.description,
      status: task.status,
      priority: task.priority,
      startDate: task.startDate ? task.startDate.toISOString() : null,
      endDate: task.endDate ? task.endDate.toISOString() : null,
      phaseId: task.phaseId,
      phaseName: task.phase.name,
      projectId: task.phase.project.id,
      projectName: task.phase.project.name,
      projectCode: task.phase.project.code,
    }));
  }
  async getTenantCalendarEvents(user: { tenantId: number | null }) {
    if (!user.tenantId) {
      throw new BadRequestException("L'utilisateur n'est lié à aucun tenant.");
    }

    const tasks = await this.prisma.task.findMany({
      where: {
        phase: {
          project: {
            tenantId: user.tenantId,
          },
        },
      },
      include: {
        phase: {
          include: {
            project: true,
          },
        },
      },
      orderBy: [{ startDate: 'asc' }, { endDate: 'asc' }],
    });

    const milestones = await this.prisma.milestone.findMany({
      where: {
        project: {
          tenantId: user.tenantId,
        },
      },
      include: {
        phase: true,
        project: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    const taskEvents = tasks.map((task) => ({
      id: `task-${task.id}`,
      entityId: task.id,
      type: 'TASK',
      title: task.name,
      description: task.description,
      status: task.status,
      priority: task.priority,
      startDate: task.startDate ? task.startDate.toISOString() : null,
      endDate: task.endDate ? task.endDate.toISOString() : null,
      projectId: task.phase.project.id,
      projectName: task.phase.project.name,
      projectCode: task.phase.project.code,
      phaseId: task.phase.id,
      phaseName: task.phase.name,
    }));

    const milestoneEvents = milestones.map((milestone) => ({
      id: `milestone-${milestone.id}`,
      entityId: milestone.id,
      type: 'MILESTONE',
      title: milestone.name,
      description: milestone.description,
      status: milestone.status,
      priority: null,
      startDate: milestone.dueDate ? milestone.dueDate.toISOString() : null,
      endDate: milestone.dueDate ? milestone.dueDate.toISOString() : null,
      projectId: milestone.project.id,
      projectName: milestone.project.name,
      projectCode: milestone.project.code,
      phaseId: milestone.phaseId,
      phaseName: milestone.phase?.name || null,
    }));

    return [...taskEvents, ...milestoneEvents].sort((a, b) => {
      const aDate = a.startDate ? new Date(a.startDate).getTime() : Infinity;
      const bDate = b.startDate ? new Date(b.startDate).getTime() : Infinity;
      return aDate - bDate;
    });
  }
}
