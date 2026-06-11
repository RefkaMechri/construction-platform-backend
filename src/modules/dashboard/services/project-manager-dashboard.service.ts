import { ForbiddenException, Injectable } from '@nestjs/common';
import { ProjectManagerDashboardRepository } from '../repositories/project-manager-dashboard.repository';

@Injectable()
export class ProjectManagerDashboardService {
  constructor(private readonly repository: ProjectManagerDashboardRepository) {}

  async getDashboard(user: { id: number; tenantId?: number; role: string }) {
    if (!user.tenantId) {
      throw new ForbiddenException('Utilisateur sans tenant');
    }

    if (user.role !== 'PROJECT_MANAGER' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Accès réservé au chef de projet');
    }

    const [projects, unreadNotifications, latestNotifications] =
      await Promise.all([
        this.repository.getProjects(user.id, user.tenantId),
        this.repository.countUnreadNotifications(user.id),
        this.repository.getLatestNotifications(user.id),
      ]);

    const projectRows = projects.map((project) => {
      const tasks = project.phases.flatMap((phase) => phase.tasks);
      const totalTasks = tasks.length;
      const doneTasks = tasks.filter((t) => t.status === 'DONE').length;
      const inProgressTasks = tasks.filter(
        (t) => t.status === 'IN_PROGRESS',
      ).length;
      const blockedTasks = tasks.filter((t) => t.status === 'BLOCKED').length;
      const overdueTasks = tasks.filter((t) => t.status === 'OVERDUE').length;

      const anomalies = tasks.flatMap((task) => task.anomalies);
      const openAnomalies = anomalies.filter(
        (a) => a.status !== 'RESOLVED',
      ).length;

      const progress =
        totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

      return {
        id: project.id,
        code: project.code,
        name: project.name,
        client: project.client,
        status: project.status,
        type: project.type,
        startDate: project.startDate,
        endDate: project.endDate,
        budget: Number(project.budget || 0),

        totalTasks,
        doneTasks,
        inProgressTasks,
        blockedTasks,
        overdueTasks,
        openAnomalies,
        progress,
      };
    });

    const totalTasks = projectRows.reduce((s, p) => s + p.totalTasks, 0);
    const doneTasks = projectRows.reduce((s, p) => s + p.doneTasks, 0);
    const blockedTasks = projectRows.reduce((s, p) => s + p.blockedTasks, 0);
    const overdueTasks = projectRows.reduce((s, p) => s + p.overdueTasks, 0);
    const openAnomalies = projectRows.reduce((s, p) => s + p.openAnomalies, 0);

    const globalProgress =
      totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    const upcomingMilestones = projects
      .flatMap((project) =>
        project.milestones.map((m) => ({
          id: m.id,
          name: m.name,
          status: m.status,
          dueDate: m.dueDate,
          projectId: project.id,
          projectName: project.name,
          projectCode: project.code,
        })),
      )
      .filter((m) => new Date(m.dueDate) >= new Date())
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      )
      .slice(0, 8);

    const alerts = this.buildAlerts(projectRows, upcomingMilestones);

    return {
      overview: {
        totalProjects: projectRows.length,
        activeProjects: projectRows.filter((p) => p.status === 'EN_COURS')
          .length,
        totalTasks,
        doneTasks,
        blockedTasks,
        overdueTasks,
        openAnomalies,
        globalProgress,
        upcomingMilestones: upcomingMilestones.length,
        unreadNotifications,
        alerts: alerts.length,
      },

      projects: {
        recentProjects: projectRows.slice(0, 8),
        progressByProject: projectRows.map((p) => ({
          projectId: p.id,
          projectCode: p.code,
          projectName: p.name,
          progress: p.progress,
          totalTasks: p.totalTasks,
          doneTasks: p.doneTasks,
          overdueTasks: p.overdueTasks,
          blockedTasks: p.blockedTasks,
        })),
      },

      tasks: {
        total: totalTasks,
        done: doneTasks,
        blocked: blockedTasks,
        overdue: overdueTasks,
        inProgress: projectRows.reduce((s, p) => s + p.inProgressTasks, 0),
      },

      milestones: {
        upcoming: upcomingMilestones,
      },

      charts: {
        projectProgress: projectRows.map((p) => ({
          name: p.code,
          progress: p.progress,
        })),
        taskStatus: [
          { name: 'Terminées', value: doneTasks },
          {
            name: 'En cours',
            value: projectRows.reduce((s, p) => s + p.inProgressTasks, 0),
          },
          { name: 'Bloquées', value: blockedTasks },
          { name: 'En retard', value: overdueTasks },
        ],
        risksByProject: projectRows.map((p) => ({
          name: p.code,
          anomalies: p.openAnomalies,
          overdue: p.overdueTasks,
          blocked: p.blockedTasks,
        })),
      },

      alerts: {
        total: alerts.length,
        items: alerts,
      },

      notifications: {
        unread: unreadNotifications,
        latest: latestNotifications,
      },
    };
  }

  private buildAlerts(projects: any[], milestones: any[]) {
    const alerts: any[] = [];

    projects.forEach((project) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (project.overdueTasks > 0) {
        alerts.push({
          type: 'OVERDUE_TASKS',
          severity: 'WARNING',
          title: 'Tâches en retard',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          message: `${project.code} - ${project.overdueTasks} tâche(s) en retard`,
          sourceType: 'PROJECT',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          sourceId: project.id,
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (project.blockedTasks > 0) {
        alerts.push({
          type: 'BLOCKED_TASKS',
          severity: 'CRITICAL',
          title: 'Tâches bloquées',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          message: `${project.code} - ${project.blockedTasks} tâche(s) bloquée(s)`,
          sourceType: 'PROJECT',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          sourceId: project.id,
        });
      }
    });

    milestones.slice(0, 3).forEach((m) => {
      alerts.push({
        type: 'UPCOMING_MILESTONE',
        severity: 'INFO',
        title: 'Jalon proche',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        message: `${m.projectCode} - ${m.name}`,
        sourceType: 'MILESTONE',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        sourceId: m.id,
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return alerts.slice(0, 10);
  }
}
