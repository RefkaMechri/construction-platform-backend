import { Body, Controller, Param, Post } from '@nestjs/common';
import { PlanningImpactSimulationService } from '../services/planning-impact-simulation.service';
import { OpenRouterImpactReportService } from '../services/ollama-impact-report.service';

@Controller('ai/planning')
export class AiPlanningImpactController {
  constructor(
    private readonly simulationService: PlanningImpactSimulationService,
    private readonly openRouterImpactReportService: OpenRouterImpactReportService,
  ) {}

  @Post('tasks/:taskId/simulate-impact')
  async simulateImpact(
    @Param('taskId') taskId: string,
    @Body() body: { startDate: string; endDate: string },
  ) {
    const simulation = await this.simulationService.simulate(+taskId, body);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.openRouterImpactReportService.generateReport(simulation);
  }
}
