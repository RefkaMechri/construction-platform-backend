import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { EmployeeAssignmentsController } from './controllers/employee-assignments.controller';
import { EmployeeAssignmentsRepository } from './repositories/employee-assignments.repository';
import { EmployeeAssignmentsService } from './services/employee-assignments.service';
import { ProjectBudgetsModule } from '../project-budget/project-budgets.module';

@Module({
  controllers: [EmployeeAssignmentsController],
  providers: [
    EmployeeAssignmentsService,
    EmployeeAssignmentsRepository,
    PrismaService,
  ],
  imports: [ProjectBudgetsModule],
  exports: [EmployeeAssignmentsService],
})
export class EmployeeAssignmentsModule {}
