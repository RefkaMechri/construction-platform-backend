import { Controller, Get, Param, Post } from '@nestjs/common';
import { BudgetAnalysisService } from '../services/budget-analysis.service';

@Controller('ai/budget')
export class AiBudgetController {
  constructor(private readonly budgetAnalysisService: BudgetAnalysisService) {}

  @Post('projects/:id/analyze/tenant/:tenantId')
  analyzeProjectBudget(
    @Param('id') id: string,
    @Param('tenantId') tenantId: string,
  ) {
    return this.budgetAnalysisService.analyzeProjectBudget(+id, {
      id: 0,
      tenantId: +tenantId,
      role: 'ADMIN',
    });
  }
  @Get('projects/:id/analysis/latest')
  getLatestAnalysis(@Param('id') id: string) {
    return this.budgetAnalysisService.getLatestAnalysis(+id);
  }

  @Get('projects/:id/analysis/history')
  getAnalysisHistory(@Param('id') id: string) {
    return this.budgetAnalysisService.getAnalysisHistory(+id);
  }
}
