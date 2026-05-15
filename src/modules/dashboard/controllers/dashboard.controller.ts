import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { DashboardService } from '../services/dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('site-manager')
  getSiteManagerDashboard(
    @Query('siteManagerId', ParseIntPipe) siteManagerId: number,
  ) {
    return this.dashboardService.getSiteManagerDashboard(siteManagerId);
  }
}
