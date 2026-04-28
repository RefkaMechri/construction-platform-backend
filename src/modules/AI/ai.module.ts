import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { AiPlanningController } from './controllers/ai.controller';
import { OllamaPlanningService } from './services/ollama-planning.service';
import { PlanningAnalysisService } from './services/planning-analysis.service';

@Module({
  controllers: [AiPlanningController],
  providers: [PrismaService, OllamaPlanningService, PlanningAnalysisService],
  exports: [PlanningAnalysisService],
})
export class AiModule {}
