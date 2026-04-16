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

  private hasDateOverlap(
    startA: Date,
    endA: Date,
    startB?: Date | null,
    endB?: Date | null,
  ): boolean {
    if (!startB || !endB) return false;
    return startA <= endB && endA >= startB;
  }

  private validateEmployeeAvailability(
    employee: {
      availabilityStatus?: string | null;
      unavailableFrom?: Date | null;
      unavailableTo?: Date | null;
    },
    startDate: Date,
    endDate: Date,
  ) {
    const isUnavailableStatus =
      employee.availabilityStatus &&
      employee.availabilityStatus !== 'AVAILABLE';

    const overlapsUnavailability = this.hasDateOverlap(
      startDate,
      endDate,
      employee.unavailableFrom,
      employee.unavailableTo,
    );

    if (isUnavailableStatus && overlapsUnavailability) {
      throw new BadRequestException(
        `L'employé est indisponible du ${employee.unavailableFrom?.toISOString().slice(0, 10)} au ${employee.unavailableTo?.toISOString().slice(0, 10)}.`,
      );
    }
  }

  async create(createDto: CreateEmployeeAssignmentDto) {
    const startDate = new Date(createDto.startDate);
    const endDate = new Date(createDto.endDate);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException(
        'La date de début ou la date de fin est invalide.',
      );
    }

    if (startDate > endDate) {
      throw new BadRequestException(
        'La date de début doit être inférieure ou égale à la date de fin.',
      );
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: createDto.employeeId },
    });

    if (!employee) {
      throw new NotFoundException(
        `Employé avec l'identifiant ${createDto.employeeId} introuvable.`,
      );
    }

    this.validateEmployeeAvailability(employee, startDate, endDate);

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
      throw new NotFoundException(
        `Tâche avec l'identifiant ${createDto.taskId} introuvable.`,
      );
    }

    const taskTenantId = task.phase.project.tenantId;

    if (employee.tenantId !== taskTenantId) {
      throw new BadRequestException(
        "L'employé et la tâche doivent appartenir à la même entreprise.",
      );
    }

    const conflict = await this.employeeAssignmentsRepository.findConflict(
      createDto.employeeId,
      startDate,
      endDate,
    );

    if (conflict) {
      throw new BadRequestException(
        "L'employé est déjà affecté pendant cette période.",
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
      throw new NotFoundException(
        `Affectation employé avec l'identifiant ${id} introuvable.`,
      );
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

    if (
      Number.isNaN(nextStartDate.getTime()) ||
      Number.isNaN(nextEndDate.getTime())
    ) {
      throw new BadRequestException(
        'La date de début ou la date de fin est invalide.',
      );
    }

    if (nextStartDate > nextEndDate) {
      throw new BadRequestException(
        'La date de début doit être inférieure ou égale à la date de fin.',
      );
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: nextEmployeeId },
    });

    if (!employee) {
      throw new NotFoundException(
        `Employé avec l'identifiant ${nextEmployeeId} introuvable.`,
      );
    }

    this.validateEmployeeAvailability(employee, nextStartDate, nextEndDate);

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
      throw new NotFoundException(
        `Tâche avec l'identifiant ${nextTaskId} introuvable.`,
      );
    }

    const taskTenantId = task.phase.project.tenantId;

    if (employee.tenantId !== taskTenantId) {
      throw new BadRequestException(
        "L'employé et la tâche doivent appartenir à la même entreprise.",
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
        "L'employé est déjà affecté pendant cette période.",
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
