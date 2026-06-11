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
import { ProjectFinancialReportService } from '../services/project-financial-report.service';

type GenerateFinancialReportDto = {
  periodStart?: string;
  periodEnd?: string;
};

@Controller('ai/project-financial-report')
export class ProjectFinancialReportController {
  constructor(
    private readonly projectFinancialReportService: ProjectFinancialReportService,
  ) {}

  @Post('projects/:id/generate')
  generateProjectFinancialReport(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: GenerateFinancialReportDto,
    @Req() req,
  ) {
    return this.projectFinancialReportService.generateProjectFinancialReport(
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
    return this.projectFinancialReportService.getLatestReport(id);
  }

  @Get('projects/:id/history')
  getReportHistory(@Param('id', ParseIntPipe) id: number) {
    return this.projectFinancialReportService.getReportHistory(id);
  }

  @Get('reports/:id')
  getReportById(@Param('id', ParseIntPipe) id: number) {
    return this.projectFinancialReportService.getReportById(id);
  }

  @Delete('reports/:id')
  deleteReport(@Param('id', ParseIntPipe) id: number) {
    return this.projectFinancialReportService.deleteReport(id);
  }
}
