/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreateEmployeeAssignmentDto } from '../dto/create-employee-assignment.dto';
import { UpdateEmployeeAssignmentDto } from '../dto/update-employee-assignment.dto';
import { EmployeeAssignmentsRepository } from '../repositories/employee-assignments.repository';
import { EmployeeAssignedTaskResponseDto } from '../dto/employee-assigned-task-response.dto';

@Injectable()
export class EmployeeAssignmentsService {
  constructor(
    private readonly employeeAssignmentsRepository: EmployeeAssignmentsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(createDto: CreateEmployeeAssignmentDto) {
    const startDate = new Date(createDto.startDate);
    const endDate = new Date(createDto.endDate);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid startDate or endDate');
    }

    if (startDate > endDate) {
      throw new BadRequestException(
        'startDate must be less than or equal to endDate',
      );
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: createDto.employeeId },
    });

    if (!employee) {
      throw new NotFoundException(
        `Employee with ID ${createDto.employeeId} not found`,
      );
    }

    const task = await this.prisma.task.findUnique({
      where: { id: createDto.taskId },
      include: {
        phase: {
          include: {
            project: {
              select: {
                id: true,
                tenantId: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${createDto.taskId} not found`);
    }

    const taskTenantId = task.phase.project.tenantId;

    if (employee.tenantId !== taskTenantId) {
      throw new BadRequestException(
        'Employee and Task must belong to the same tenant',
      );
    }

    const conflict = await this.employeeAssignmentsRepository.findConflict(
      createDto.employeeId,
      startDate,
      endDate,
    );

    if (conflict) {
      throw new BadRequestException(
        'Employee is already assigned during this period',
      );
    }

    const data: Prisma.EmployeeAssignmentCreateInput = {
      startDate,
      endDate,
      notes: createDto.notes,
      employee: {
        connect: {
          id: createDto.employeeId,
        },
      },
      task: {
        connect: {
          id: createDto.taskId,
        },
      },
      ...(createDto.createdById !== undefined && {
        createdById: createDto.createdById,
      }),
    };

    return this.employeeAssignmentsRepository.create(data);
  }

  async findAll() {
    return this.employeeAssignmentsRepository.findAll();
  }

  async findOne(id: number) {
    const assignment = await this.employeeAssignmentsRepository.findById(id);

    if (!assignment) {
      throw new NotFoundException(`EmployeeAssignment with ID ${id} not found`);
    }

    return assignment;
  }

  async findByTaskId(taskId: number) {
    return this.employeeAssignmentsRepository.findByTaskId(taskId);
  }

  async findByEmployeeId(employeeId: number) {
    return this.employeeAssignmentsRepository.findByEmployeeId(employeeId);
  }

  async update(id: number, updateDto: UpdateEmployeeAssignmentDto) {
    const current = await this.findOne(id);

    const nextEmployeeId = updateDto.employeeId ?? current.employeeId;
    const nextTaskId = updateDto.taskId ?? current.taskId;
    const nextStartDate = updateDto.startDate
      ? new Date(updateDto.startDate)
      : current.startDate;
    const nextEndDate = updateDto.endDate
      ? new Date(updateDto.endDate)
      : current.endDate;

    if (nextStartDate > nextEndDate) {
      throw new BadRequestException(
        'startDate must be less than or equal to endDate',
      );
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: nextEmployeeId },
    });

    if (!employee) {
      throw new NotFoundException(
        `Employee with ID ${nextEmployeeId} not found`,
      );
    }

    const task = await this.prisma.task.findUnique({
      where: { id: nextTaskId },
      include: {
        phase: {
          include: {
            project: {
              select: {
                id: true,
                tenantId: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${nextTaskId} not found`);
    }

    const taskTenantId = task.phase.project.tenantId;

    if (employee.tenantId !== taskTenantId) {
      throw new BadRequestException(
        'Employee and Task must belong to the same tenant',
      );
    }

    const conflict = await this.employeeAssignmentsRepository.findConflict(
      nextEmployeeId,
      nextStartDate,
      nextEndDate,
      id,
    );

    if (conflict) {
      throw new BadRequestException(
        'Employee is already assigned during this period',
      );
    }

    const data: Prisma.EmployeeAssignmentUpdateInput = {
      ...(updateDto.startDate !== undefined && {
        startDate: new Date(updateDto.startDate),
      }),
      ...(updateDto.endDate !== undefined && {
        endDate: new Date(updateDto.endDate),
      }),
      ...(updateDto.notes !== undefined && {
        notes: updateDto.notes,
      }),
      ...(updateDto.employeeId !== undefined && {
        employee: {
          connect: {
            id: updateDto.employeeId,
          },
        },
      }),
      ...(updateDto.taskId !== undefined && {
        task: {
          connect: {
            id: updateDto.taskId,
          },
        },
      }),
      ...(updateDto.createdById !== undefined && {
        createdBy: updateDto.createdById
          ? {
              connect: {
                id: updateDto.createdById,
              },
            }
          : {
              disconnect: true,
            },
      }),
    };

    return this.employeeAssignmentsRepository.update(id, data);
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.employeeAssignmentsRepository.delete(id);
  }
  async getTasksByEmployeeId(
    employeeId: number,
  ): Promise<EmployeeAssignedTaskResponseDto[]> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException(`Employé ${employeeId} introuvable`);
    }

    const assignments =
      await this.employeeAssignmentsRepository.findAssignmentsByEmployeeId(
        employeeId,
      );

    return assignments.map((assignment) => ({
      assignmentId: assignment.id,
      taskId: assignment.task.id,
      taskName: assignment.task.name,
      startDate: assignment.startDate,
      endDate: assignment.endDate,
      notes: assignment.notes,
    }));
  }
}
