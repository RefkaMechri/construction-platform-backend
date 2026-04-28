import { Controller, Get, Param, Post } from '@nestjs/common';
import { PlanningAnalysisService } from '../services/planning-analysis.service';

@Controller('ai/planning')
export class AiPlanningController {
  constructor(
    private readonly planningAnalysisService: PlanningAnalysisService,
  ) {}

  @Post('projects/:id/analyze/tenant/:tenantId')
  analyzeProjectPlanning(
    @Param('id') id: string,
    @Param('tenantId') tenantId: string,
  ) {
    return this.planningAnalysisService.analyzeProjectPlanning(+id, {
      id: 0,
      tenantId: +tenantId,
      role: 'ADMIN',
    });
  }
  @Get('projects/:id/analysis/latest')
  getLatestAnalysis(@Param('id') id: string) {
    return this.planningAnalysisService.getLatestAnalysis(+id);
  }

  @Get('projects/:id/analysis/history')
  getAnalysisHistory(@Param('id') id: string) {
    return this.planningAnalysisService.getAnalysisHistory(+id);
  }
}
