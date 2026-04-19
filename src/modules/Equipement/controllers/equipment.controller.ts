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
import { EquipmentService } from '../services/equipment.service';
import { CreateEquipmentDto } from '../dto/create-equipment.dto';
import { UpdateEquipmentDto } from '../dto/update-equipment.dto';
import { EquipmentAssignmentsService } from '../services/equipmentassignments.service';
import { UpdateEquipmentDailyCostDto } from '../dto/update-equipment-daily-cost.dto';

@Controller('equipments')
export class EquipmentController {
  constructor(
    private readonly equipmentService: EquipmentService,
    private readonly equipmentAssignmentsService: EquipmentAssignmentsService,
  ) {}
  @Get('/resources/by-project/:projectId')
  findResourcesByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query('tenantId', ParseIntPipe) tenantId: number,
  ) {
    return this.equipmentService.findResourcesByProject(projectId, tenantId);
  }

  @Post()
  create(@Body() createEquipmentDto: CreateEquipmentDto) {
    return this.equipmentService.create(createEquipmentDto);
  }
  @Get(':id/assigned-tasks')
  getAssignedTasksByEquipment(@Param('id', ParseIntPipe) id: number) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.equipmentAssignmentsService.getTasksByEquipmentId(id);
  }
  @Get()
  findAll() {
    return this.equipmentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.equipmentService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEquipmentDto: UpdateEquipmentDto,
  ) {
    return this.equipmentService.update(id, updateEquipmentDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.equipmentService.remove(id);
  }
  @Patch(':id/daily-cost')
  updateDailyCost(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEquipmentDailyCostDto,
  ) {
    return this.equipmentService.updateDailyCost(id, dto);
  }
}
