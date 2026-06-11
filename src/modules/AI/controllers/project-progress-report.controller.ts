/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ProjectProgressReportService } from '../services/project-progress-report.service';

type GenerateProgressReportDto = {
  periodStart?: string;
  periodEnd?: string;
};

@Controller('ai/project-progress-report')
export class ProjectProgressReportController {
  constructor(
    private readonly projectProgressReportService: ProjectProgressReportService,
  ) {}

  @Post('projects/:id/generate')
  generateProjectProgressReport(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: GenerateProgressReportDto,
    @Req() req,
  ) {
    return this.projectProgressReportService.generateProjectProgressReport(
      id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      req.user,
      {
        periodStart: body?.periodStart,
        periodEnd: body?.periodEnd,
      },
    );
  }

  @Get('projects/:id/latest')
  getLatestReport(@Param('id', ParseIntPipe) id: number) {
    return this.projectProgressReportService.getLatestReport(id);
  }

  @Get('projects/:id/history')
  getReportHistory(@Param('id', ParseIntPipe) id: number) {
    return this.projectProgressReportService.getReportHistory(id);
  }

  @Get('reports/:id')
  getReportById(@Param('id', ParseIntPipe) id: number) {
    return this.projectProgressReportService.getReportById(id);
  }

  @Delete('reports/:id')
  deleteReport(@Param('id', ParseIntPipe) id: number) {
    return this.projectProgressReportService.deleteReport(id);
  }
}
