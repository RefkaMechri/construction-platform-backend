/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { MaterialService } from '../services/material.service';
import { CreateMaterialDto } from '../dto/create-material.dto';
import { UpdateMaterialDto } from '../dto/update-material.dto';
import { MaterialAssignmentsService } from '../services/materialassignments.service';
import { UpdateMaterialUnitPriceDto } from '../dto/update-material-unit-price.dto';

@Controller('materials')
export class MaterialController {
  constructor(
    private readonly materialService: MaterialService,
    private readonly materialAssignmentsService: MaterialAssignmentsService,
  ) {}
  @Get('/resources/by-project/:projectId')
  findResourcesByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query('tenantId', ParseIntPipe) tenantId: number,
  ) {
    return this.materialService.findResourcesByProject(projectId, tenantId);
  }
  @Post()
  create(@Body() createMaterialDto: CreateMaterialDto) {
    return this.materialService.create(createMaterialDto);
  }
  @Get(':id/assigned-tasks')
  getAssignedTasksByMaterial(@Param('id', ParseIntPipe) id: number) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.materialAssignmentsService.getTasksByMaterialId(id);
  }
  @Get()
  findAll() {
    return this.materialService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.materialService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMaterialDto: UpdateMaterialDto,
  ) {
    return this.materialService.update(id, updateMaterialDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.materialService.remove(id);
  }
  @Patch(':id/unit-price')
  updateUnitPrice(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMaterialUnitPriceDto,
  ) {
    return this.materialService.updateUnitPrice(id, dto);
  }
}
