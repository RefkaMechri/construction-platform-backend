import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { ProjectBudgetsService } from '../services/project-budgets.service';
import { UpdateContingencyDto } from '../dto/update-contingency.dto';

@Controller('project-budgets')
export class ProjectBudgetsController {
  constructor(private readonly projectBudgetsService: ProjectBudgetsService) {}

  @Get('tasks/:taskId/direct-costs')
  getTaskDirectCosts(@Param('taskId', ParseIntPipe) taskId: number) {
    return this.projectBudgetsService.calculateTaskDirectCosts(taskId);
  }

  @Get('phases/:phaseId/direct-costs')
  getPhaseDirectCosts(@Param('phaseId', ParseIntPipe) phaseId: number) {
    return this.projectBudgetsService.getPhaseDirectCosts(phaseId);
  }

  @Get('projects/:projectId/direct-costs')
  getProjectDirectCosts(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.projectBudgetsService.getProjectDirectCosts(projectId);
  }
  @Get('projects/:projectId/actual-direct-costs')
  getProjectActualDirectCosts(
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.projectBudgetsService.getProjectActualDirectCosts(projectId);
  }
  @Get('projects/:projectId/direct-costs-variance')
  getProjectDirectCostsVariance(
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.projectBudgetsService.getProjectDirectCostsVariance(projectId);
  }
  @Get('projects/:projectId/budget-overview')
  getProjectBudgetOverview(
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.projectBudgetsService.getProjectBudgetOverview(projectId);
  }

  @Patch('projects/:projectId/contingency')
  updateContingencyRate(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() dto: UpdateContingencyDto,
  ) {
    const { contingencyRate } = dto;

    if (contingencyRate === undefined) {
      throw new BadRequestException('contingencyRate is required');
    }

    return this.projectBudgetsService.updateContingencyRate(
      projectId,
      contingencyRate,
    );
  }

  @Get('projects/:projectId/contingency')
  getContingencyRate(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.projectBudgetsService.getContingencyRate(projectId);
  }
  @Get('projects/:projectId/summary')
  getProjectBudgetSummary(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.projectBudgetsService.getProjectBudgetSummary(projectId);
  }
  @Get('project-managers/:projectManagerId/projects/:projectId/module')
  getBudgetModuleForProjectManager(
    @Param('projectManagerId', ParseIntPipe) projectManagerId: number,
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.projectBudgetsService.getBudgetModuleForProjectManager(
      projectManagerId,
      projectId,
    );
  }
}
