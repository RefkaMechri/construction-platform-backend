import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { AiPlanningController } from './controllers/ai.controller';
import { OllamaPlanningService } from './services/ollama-planning.service';
import { PlanningAnalysisService } from './services/planning-analysis.service';
import { OllamaResourceService } from './services/ollama-resource.service';
import { ResourceAnalysisService } from './services/ressource-analysis.service';
import { AiResourceController } from './controllers/ai-resource.controller';
import { AiPlanningImpactController } from './controllers/ai-planning-impact.controller';
import { PlanningImpactSimulationService } from './services/planning-impact-simulation.service';
import { OllamaImpactReportService } from './services/ollama-impact-report.service';
import { AiBudgetController } from './controllers/ai-budget.controller';
import { BudgetAnalysisService } from './services/budget-analysis.service';
import { OllamaBudgetService } from './services/ollama-budget.service';

@Module({
  controllers: [
    AiPlanningController,
    AiResourceController,
    AiPlanningImpactController,
    AiBudgetController,
  ],
  providers: [
    PrismaService,
    PlanningAnalysisService,
    OllamaPlanningService,
    ResourceAnalysisService,
    OllamaResourceService,
    PlanningImpactSimulationService,
    OllamaImpactReportService,
    BudgetAnalysisService,
    OllamaBudgetService,
  ],
  exports: [PlanningAnalysisService],
})
export class AiModule {}
