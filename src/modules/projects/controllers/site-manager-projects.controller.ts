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

@Controller('site-manager/projects')
export class SiteManagerProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

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
}
