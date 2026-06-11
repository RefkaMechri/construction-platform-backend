import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { AiPlanningController } from './controllers/ai.controller';
import { OpenRouterPlanningService } from './services/ollama-planning.service';
import { PlanningAnalysisService } from './services/planning-analysis.service';
import { OpenRouterResourceService } from './services/ollama-resource.service';
import { ResourceAnalysisService } from './services/ressource-analysis.service';
import { AiResourceController } from './controllers/ai-resource.controller';
import { AiPlanningImpactController } from './controllers/ai-planning-impact.controller';
import { PlanningImpactSimulationService } from './services/planning-impact-simulation.service';
import { OpenRouterImpactReportService } from './services/ollama-impact-report.service';
import { AiBudgetController } from './controllers/ai-budget.controller';
import { BudgetAnalysisService } from './services/budget-analysis.service';
import { OpenRouterBudgetService } from './services/ollama-budget.service';
import { PortfolioAnalysisController } from './controllers/portfolio-analysis.controller';
import { PortfolioAnalysisService } from './services/portfolio-analysis.service';
import { OpenRouterPortfolioService } from './services/openrouter-portfolio.service';
import { ProjectProgressReportController } from './controllers/project-progress-report.controller';
import { ProjectProgressReportService } from './services/project-progress-report.service';
import { OpenRouterProjectProgressReportService } from './services/openrouter-project-progress-report.service';
import { ProjectFinancialReportController } from './controllers/project-financial-report.controller';
import { ProjectFinancialReportService } from './services/project-financial-report.service';
import { OpenRouterProjectFinancialReportService } from './services/openrouter-project-financial-report.service';
@Module({
  controllers: [
    AiPlanningController,
    AiResourceController,
    AiPlanningImpactController,
    AiBudgetController,
    PortfolioAnalysisController,
    ProjectProgressReportController,
    ProjectFinancialReportController,
  ],
  providers: [
    PrismaService,
    PlanningAnalysisService,
    OpenRouterPlanningService,
    ResourceAnalysisService,
    OpenRouterResourceService,
    PlanningImpactSimulationService,
    OpenRouterImpactReportService,
    BudgetAnalysisService,
    OpenRouterBudgetService,
    PortfolioAnalysisService,
    OpenRouterPortfolioService,

    ProjectProgressReportService,
    OpenRouterProjectProgressReportService,
    ProjectFinancialReportService,
    OpenRouterProjectFinancialReportService,
  ],
  exports: [PlanningAnalysisService],
})
export class AiModule {}
