import { Module } from '@nestjs/common';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';
import { DashboardRepository } from './repositories/dashboard.repository';
import { PrismaService } from 'prisma/prisma.service';
import { DashboardAdminService } from './services/dashboard_admin.service';
import { DashboardAdminRepository } from './repositories/dashboard_admin.repository';
import { ResourceDashboardService } from './services/resource-dashboard.service';
import { ResourceDashboardRepository } from './repositories/resource-dashboard.repository';
import { SuperAdminDashboardService } from './services/super-admin-dashboard.service';
import { SuperAdminDashboardRepository } from './repositories/super-admin-dashboard.repository';
import { BudgetDashboardService } from './services/budget-dashboard.service';
import { BudgetDashboardRepository } from './repositories/budget-dashboard.repository';
import { ProjectManagerDashboardService } from './services/project-manager-dashboard.service';
import { ProjectManagerDashboardRepository } from './repositories/project-manager-dashboard.repository';
@Module({
  controllers: [DashboardController],
  providers: [
    DashboardService,
    DashboardAdminService,
    DashboardAdminRepository,
    DashboardRepository,
    ResourceDashboardService,
    ResourceDashboardRepository,
    SuperAdminDashboardService,
    SuperAdminDashboardRepository,
    BudgetDashboardService,
    BudgetDashboardRepository,
    PrismaService,
    ProjectManagerDashboardService,
    ProjectManagerDashboardRepository,
  ],
})
export class DashboardModule {}
