import { Module } from '@nestjs/common';
import { EmployeesController } from './controllers/employees.controller';
import { EmployeesService } from './services/employees.service';
import { EmployeesRepository } from './repositories/employees.repository';
import { PrismaService } from 'prisma/prisma.service';
import { EmployeeAssignmentsModule } from './employee-assignments.module';

@Module({
  imports: [EmployeeAssignmentsModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, EmployeesRepository, PrismaService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
