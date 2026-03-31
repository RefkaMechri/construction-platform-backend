import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
} from '@nestjs/common';
import express from 'express';
import { CreateTaskDependencyDto } from '../dto/create-task-dependency.dto';
import { TaskDependenciesService } from '../services/task-dependencies.service';

@Controller('task-dependencies')
export class TaskDependenciesController {
  constructor(
    private readonly taskDependenciesService: TaskDependenciesService,
  ) {}

  @Post()
  create(@Body() dto: CreateTaskDependencyDto, @Req() req: express.Request) {
    return this.taskDependenciesService.create(dto, req.user as any);
  }

  @Get('task/:taskId')
  findByTask(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Req() req: express.Request,
  ) {
    return this.taskDependenciesService.findByTask(taskId, req.user as any);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: express.Request) {
    return this.taskDependenciesService.remove(id, req.user as any);
  }
}
