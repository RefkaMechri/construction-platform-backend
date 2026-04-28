import { Controller, Get, Param, Post } from '@nestjs/common';
import { ResourceAnalysisService } from '../services/ressource-analysis.service';

@Controller('ai/resources')
export class AiResourceController {
  constructor(private service: ResourceAnalysisService) {}

  @Post('projects/:id/analyze/tenant/:tenantId')
  analyze(@Param('id') id: string, @Param('tenantId') tenantId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.service.analyze(+id, +tenantId);
  }

  @Get('projects/:id/analysis/latest')
  latest(@Param('id') id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.service.latest(+id);
  }

  @Get('projects/:id/analysis/history')
  history(@Param('id') id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.service.history(+id);
  }
}
