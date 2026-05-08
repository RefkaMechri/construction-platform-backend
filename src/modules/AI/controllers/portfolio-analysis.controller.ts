/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
} from '@nestjs/common';
import { PortfolioAnalysisService } from '../services/portfolio-analysis.service';

@Controller('portfolio-analysis')
export class PortfolioAnalysisController {
  constructor(
    private readonly portfolioAnalysisService: PortfolioAnalysisService,
  ) {}

  @Post('analyze/:tenantId')
  analyzePortfolio(@Param('tenantId', ParseIntPipe) tenantId: number) {
    return this.portfolioAnalysisService.analyzePortfolio({
      id: 1,
      tenantId,
      role: 'ADMIN',
    });
  }

  @Get('latest')
  latest(@Req() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.portfolioAnalysisService.latest(req.user);
  }

  @Get('history')
  history(@Req() req: any) {
    return this.portfolioAnalysisService.history(req.user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.portfolioAnalysisService.findOne(id, req.user);
  }
}
