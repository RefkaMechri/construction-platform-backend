import { Injectable } from '@nestjs/common';
import { DashboardRepository } from '../repositories/dashboard.repository';

@Injectable()
export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async getSiteManagerDashboard(siteManagerId: number) {
    const [projects, urgentTasks, recentAnomalies, upcomingMilestones] =
      await Promise.all([
        this.dashboardRepository.findProjectsBySiteManager(siteManagerId),
        this.dashboardRepository.findUrgentTasks(siteManagerId),
        this.dashboardRepository.findRecentAnomalies(siteManagerId),
        this.dashboardRepository.findUpcomingMilestones(siteManagerId),
      ]);

    const allTasks = projects.flatMap((project) =>
      project.phases.flatMap((phase) => phase.tasks),
    );

    const allAnomalies = allTasks.flatMap((task) => task.anomalies);

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(
      (task) => task.status === 'DONE',
    ).length;

    const globalProgress =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const projectsProgress = projects.map((project) => {
      const projectTasks = project.phases.flatMap((phase) => phase.tasks);
      const projectCompletedTasks = projectTasks.filter(
        (task) => task.status === 'DONE',
      ).length;

      const progress =
        projectTasks.length > 0
          ? Math.round((projectCompletedTasks / projectTasks.length) * 100)
          : 0;

      const projectAnomalies = projectTasks.flatMap((task) => task.anomalies);

      return {
        id: project.id,
        name: project.name,
        code: project.code,
        status: project.status,
        progress,
        totalTasks: projectTasks.length,
        completedTasks: projectCompletedTasks,
        overdueTasks: projectTasks.filter((task) => task.status === 'OVERDUE')
          .length,
        openAnomalies: projectAnomalies.filter(
          (anomaly) => anomaly.status === 'OPEN',
        ).length,
      };
    });

    return {
      stats: {
        totalProjects: projects.length,
        activeProjects: projects.filter(
          (project) => project.status === 'EN_COURS',
        ).length,
        totalTasks,
        completedTasks,
        inProgressTasks: allTasks.filter(
          (task) => task.status === 'IN_PROGRESS',
        ).length,
        overdueTasks: allTasks.filter((task) => task.status === 'OVERDUE')
          .length,
        blockedTasks: allTasks.filter((task) => task.status === 'BLOCKED')
          .length,
        openAnomalies: allAnomalies.filter(
          (anomaly) => anomaly.status === 'OPEN',
        ).length,
        criticalAnomalies: allAnomalies.filter(
          (anomaly) =>
            anomaly.status === 'OPEN' &&
            (anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH'),
        ).length,
        upcomingMilestones: upcomingMilestones.length,
      },
      progress: {
        globalProgress,
      },
      projectsProgress,
      urgentTasks: urgentTasks.map((task) => ({
        id: task.id,
        projectId: task.phase.project.id,
        name: task.name,
        status: task.status,
        priority: task.priority,
        endDate: task.endDate,
        projectName: task.phase.project.name,
        phaseName: task.phase.name,
      })),
      recentAnomalies: recentAnomalies.map((anomaly) => ({
        id: anomaly.id,
        title: anomaly.title,
        severity: anomaly.severity,
        status: anomaly.status,
        createdAt: anomaly.createdAt,
        taskName: anomaly.task.name,
        projectName: anomaly.task.phase.project.name,
      })),
      upcomingMilestones: upcomingMilestones.map((milestone) => ({
        id: milestone.id,
        name: milestone.name,
        status: milestone.status,
        dueDate: milestone.dueDate,
        projectName: milestone.project.name,
      })),
    };
  }
}
