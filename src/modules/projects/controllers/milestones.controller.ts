import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import express from 'express';
import { CreateMilestoneDto } from '../dto/create-milestone.dto';
import { UpdateMilestoneDto } from '../dto/update-milestone.dto';
import { MilestonesService } from '../services/milestones.service';

@Controller('milestones')
export class MilestonesController {
  constructor(private readonly service: MilestonesService) {}

  @Post()
  create(@Body() dto: CreateMilestoneDto, @Req() req: express.Request) {
    return this.service.create(dto, req.user as any);
  }

  @Get('project/:projectId')
  findByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.service.findByProject(projectId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMilestoneDto,
    @Req() req: express.Request,
  ) {
    return this.service.update(id, dto, req.user as any);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
