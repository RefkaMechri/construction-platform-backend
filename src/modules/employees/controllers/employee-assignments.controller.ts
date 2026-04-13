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
import { CreateEmployeeAssignmentDto } from '../dto/create-employee-assignment.dto';
import { UpdateEmployeeAssignmentDto } from '../dto/update-employee-assignment.dto';
import { EmployeeAssignmentsService } from '../services/employee-assignments.service';

@Controller('employee-assignments')
export class EmployeeAssignmentsController {
  constructor(
    private readonly employeeAssignmentsService: EmployeeAssignmentsService,
  ) {}

  @Post()
  create(@Body() createDto: CreateEmployeeAssignmentDto) {
    return this.employeeAssignmentsService.create(createDto);
  }

  @Get()
  findAll(
    @Query('taskId') taskId?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    if (taskId) {
      return this.employeeAssignmentsService.findByTaskId(Number(taskId));
    }

    if (employeeId) {
      return this.employeeAssignmentsService.findByEmployeeId(
        Number(employeeId),
      );
    }

    return this.employeeAssignmentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.employeeAssignmentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateEmployeeAssignmentDto,
  ) {
    return this.employeeAssignmentsService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.employeeAssignmentsService.remove(id);
  }
}
