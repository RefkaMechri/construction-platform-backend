import { Module } from '@nestjs/common';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';
import { DashboardRepository } from './repositories/dashboard.repository';
import { PrismaService } from 'prisma/prisma.service';
import { DashboardAdminService } from './services/dashboard_admin.service';
import { DashboardAdminRepository } from './repositories/dashboard_admin.repository';

@Module({
  controllers: [DashboardController],
  providers: [
    DashboardService,
    DashboardAdminService,
    DashboardAdminRepository,
    DashboardRepository,
    PrismaService,
  ],
})
export class DashboardModule {}
