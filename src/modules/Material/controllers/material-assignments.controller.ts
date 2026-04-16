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
import { CreateMaterialAssignmentDto } from '../dto/create-material-assignment.dto';
import { UpdateMaterialAssignmentDto } from '../dto/update-material-assignment.dto';
import { MaterialAssignmentsService } from '../services/materialassignments.service';

@Controller('material-assignments')
export class MaterialAssignmentsController {
  constructor(
    private readonly materialAssignmentsService: MaterialAssignmentsService,
  ) {}

  @Post()
  create(@Body() createDto: CreateMaterialAssignmentDto) {
    return this.materialAssignmentsService.create(createDto);
  }

  @Get()
  findAll(
    @Query('taskId') taskId?: string,
    @Query('materialId') materialId?: string,
  ) {
    if (taskId) {
      return this.materialAssignmentsService.findByTaskId(Number(taskId));
    }

    if (materialId) {
      return this.materialAssignmentsService.findByMaterialId(
        Number(materialId),
      );
    }

    return this.materialAssignmentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.materialAssignmentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateMaterialAssignmentDto,
  ) {
    return this.materialAssignmentsService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.materialAssignmentsService.remove(id);
  }
}
