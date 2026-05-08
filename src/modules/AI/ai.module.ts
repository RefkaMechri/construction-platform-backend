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
@Module({
  controllers: [
    AiPlanningController,
    AiResourceController,
    AiPlanningImpactController,
    AiBudgetController,
    PortfolioAnalysisController,
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
  ],
  exports: [PlanningAnalysisService],
})
export class AiModule {}
