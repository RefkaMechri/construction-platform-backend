/* eslint-disable @typescript-eslint/no-unsafe-argument */
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
import type { Request } from 'express';
import { CreatePhaseDto } from '../dto/create-phase.dto';
import { UpdatePhaseDto } from '../dto/update-phase.dto';
import { PhasesService } from '../services/phases.service';

@Controller('phases')
export class PhasesController {
  constructor(private readonly phasesService: PhasesService) {}

  @Post()
  create(@Body() createPhaseDto: CreatePhaseDto, @Req() req: Request) {
    return this.phasesService.create(createPhaseDto, req.user as any);
  }

  @Get('project/:projectId')
  findByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Req() req: Request,
  ) {
    return this.phasesService.findByProject(projectId, req.user as any);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.phasesService.findOne(id, req.user as any);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePhaseDto: UpdatePhaseDto,
    @Req() req: Request,
  ) {
    return this.phasesService.update(id, updatePhaseDto, req.user as any);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.phasesService.remove(id, req.user as any);
  }
}
