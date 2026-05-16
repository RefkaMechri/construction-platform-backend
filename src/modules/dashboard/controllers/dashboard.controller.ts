import { Controller, Get, ParseIntPipe, Query, Req } from '@nestjs/common';
import { DashboardAdminService } from '../services/dashboard_admin.service';
import { DashboardQueryDto } from '../dto/dashboard-query.dto';
import { DashboardService } from '../services/dashboard.service';
import { ResourceDashboardService } from '../services/resource-dashboard.service';
import { ResourceDashboardQueryDto } from '../dto/resource-dashboard-query.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly dashboardAdminService: DashboardAdminService,
    private readonly resourceDashboardService: ResourceDashboardService,
  ) {}

  @Get('site-manager')
  getSiteManagerDashboard(
    @Query('siteManagerId', ParseIntPipe) siteManagerId: number,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.dashboardService.getSiteManagerDashboard(siteManagerId);
  }
  @Get('admin-tenant')
  getAdminTenantDashboard(@Req() req, @Query() query: DashboardQueryDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.dashboardAdminService.getAdminTenantDashboard(req.user, query);
  }
  @Get('resource-manager')
  getDashboard(@Req() req, @Query() query: ResourceDashboardQueryDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.resourceDashboardService.getDashboard(req.user, query);
  }
}
