import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { GlobalTasksService } from '../services/global-tasks.service';

@Controller('projects')
export class GlobalTasksController {
  constructor(private readonly globalTasksService: GlobalTasksService) {}

  @Get('tasks/all')
  getAllTasks(@Req() req: Request) {
    return this.globalTasksService.getAllTenantTasks(req.user as any);
  }
  @Get('planning/calendar')
  getCalendar(@Req() req: Request) {
    return this.globalTasksService.getTenantCalendarEvents(req.user as any);
  }
}
