import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { AiPlanningController } from './controllers/ai.controller';
import { OllamaPlanningService } from './services/ollama-planning.service';
import { PlanningAnalysisService } from './services/planning-analysis.service';
import { OllamaResourceService } from './services/ollama-resource.service';
import { ResourceAnalysisService } from './services/ressource-analysis.service';
import { AiResourceController } from './controllers/ai-resource.controller';

@Module({
  controllers: [AiPlanningController, AiResourceController],
  providers: [
    PrismaService,
    OllamaPlanningService,
    PlanningAnalysisService,
    OllamaResourceService,
    ResourceAnalysisService,
  ],
  exports: [PlanningAnalysisService],
})
export class AiModule {}
