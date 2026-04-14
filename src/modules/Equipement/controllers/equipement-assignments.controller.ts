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
import { CreateEquipementAssignmentDto } from '../dto/create-equipement-assignment.dto';
import { UpdateEquipementAssignmentDto } from '../dto/update-equipement-assignment.dto';
import { EquipmentAssignmentsService } from '../services/equipmentassignments.service';

@Controller('equipment-assignments')
export class EquipmentAssignmentsController {
  constructor(
    private readonly equipmentAssignmentsService: EquipmentAssignmentsService,
  ) {}

  @Post()
  create(@Body() createDto: CreateEquipementAssignmentDto) {
    return this.equipmentAssignmentsService.create(createDto);
  }

  @Get()
  findAll(
    @Query('taskId') taskId?: string,
    @Query('equipmentId') equipmentId?: string,
  ) {
    if (taskId) {
      return this.equipmentAssignmentsService.findByTaskId(Number(taskId));
    }

    if (equipmentId) {
      return this.equipmentAssignmentsService.findByEquipmentId(
        Number(equipmentId),
      );
    }

    return this.equipmentAssignmentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.equipmentAssignmentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateEquipementAssignmentDto,
  ) {
    return this.equipmentAssignmentsService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.equipmentAssignmentsService.remove(id);
  }
}
