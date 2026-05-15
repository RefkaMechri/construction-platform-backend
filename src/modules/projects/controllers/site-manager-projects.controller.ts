import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { UpdateTaskStatusDto } from '../dto/site-manager/update-task-status.dto';
import { ProjectsService } from '../services/projects.service';
import { UpdateMaterialUsageDto } from 'src/modules/Material/dto/update-material-usage.dto';
import { MaterialAssignmentsService } from 'src/modules/Material/services/materialassignments.service';
import { TasksService } from '../services/tasks.service';
@Controller('site-manager/projects')
export class SiteManagerProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly MaterialAssignmentsService: MaterialAssignmentsService,
    private readonly TasksService: TasksService,
  ) {}

  @Get()
  getAssignedProjects(@Req() req: Request) {
    return this.projectsService.getAssignedProjects(req.user as any);
  }

  @Get(':id')
  getAssignedProjectById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    return this.projectsService.getAssignedProjectById(id, req.user as any);
  }
  @Get(':projectId/tasks/:taskId')
  getAssignedProjectTaskDetails(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Req() req: Request,
  ) {
    return this.TasksService.getAssignedProjectTaskDetails(
      projectId,
      taskId,
      req.user as any,
    );
  }
  @Patch(':projectId/tasks/:taskId/status')
  updateAssignedProjectTaskStatus(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() updateTaskStatusDto: UpdateTaskStatusDto,
    @Req() req: Request,
  ) {
    return this.projectsService.updateAssignedProjectTaskStatus(
      projectId,
      taskId,
      updateTaskStatusDto.status,
      req.user as any,
    );
  }
  @Patch(':projectId/tasks/:taskId/materials/:assignmentId/usage')
  updateTaskMaterialUsage(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Body() updateMaterialUsageDto: UpdateMaterialUsageDto,
    @Req() req: Request,
  ) {
    return this.MaterialAssignmentsService.updateTaskMaterialUsage(
      projectId,
      taskId,
      assignmentId,
      updateMaterialUsageDto.usedQuantity,
      req.user as any,
    );
  }
}
