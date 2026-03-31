import { Controller, Get, Param, ParseIntPipe, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CriticalPathService } from '../services/critical-path.service';

@Controller('projects')
export class CriticalPathController {
  constructor(private readonly criticalPathService: CriticalPathService) {}

  @Get(':id/critical-path')
  getCriticalPath(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.criticalPathService.getProjectCriticalPath(id, req.user as any);
  }
}
