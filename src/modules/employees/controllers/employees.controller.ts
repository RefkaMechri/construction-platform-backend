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
import { EmployeesService } from '../services/employees.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { EmployeeAssignmentsService } from '../services/employee-assignments.service';
import { UpdateEmployeeDailyCostDto } from '../dto/update-employee-daily-cost.dto';

@Controller('employees')
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly employeeAssignmentsService: EmployeeAssignmentsService,
  ) {}

  @Get('/resources/by-project/:projectId')
  findResourcesByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query('tenantId', ParseIntPipe) tenantId: number,
  ) {
    return this.employeesService.findResourcesByProject(projectId, tenantId);
  }

  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Get()
  findAllByTenant(@Query('tenantId', ParseIntPipe) tenantId: number) {
    return this.employeesService.findAllByTenant(tenantId);
  }

  @Get(':id/assigned-tasks')
  getAssignedTasksByEmployee(@Param('id', ParseIntPipe) id: number) {
    return this.employeeAssignmentsService.getTasksByEmployeeId(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.employeesService.remove(id);
  }
  @Patch(':id/daily-cost')
  updateDailyCost(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDailyCostDto,
  ) {
    return this.employeesService.updateDailyCost(id, dto);
  }
}
