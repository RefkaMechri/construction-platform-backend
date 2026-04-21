/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreateEquipementAssignmentDto } from '../dto/create-equipement-assignment.dto';
import { UpdateEquipementAssignmentDto } from '../dto/update-equipement-assignment.dto';
import { EquipmentAssignmentsRepository } from '../repositories/equipement-assignments.repository';
import { EquipmentAssignedTaskResponseDto } from '../dto/equipement-assigned-task-response.dto';
import { ProjectBudgetsService } from 'src/modules/project-budget/services/project-budgets.service';

@Injectable()
export class EquipmentAssignmentsService {
  constructor(
    private readonly equipmentAssignmentsRepository: EquipmentAssignmentsRepository,
    private readonly prisma: PrismaService,
    private readonly projectBudgetsService: ProjectBudgetsService,
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

  private validateEquipmentAvailability(
    equipment: {
      availabilityStatus?: string | null;
      unavailableFrom?: Date | null;
      unavailableTo?: Date | null;
    },
    startDate: Date,
    endDate: Date,
  ) {
    const isUnavailableStatus =
      equipment.availabilityStatus &&
      equipment.availabilityStatus !== 'AVAILABLE';

    const overlapsUnavailability = this.hasDateOverlap(
      startDate,
      endDate,
      equipment.unavailableFrom,
      equipment.unavailableTo,
    );

    if (isUnavailableStatus && overlapsUnavailability) {
      throw new BadRequestException(
        `L'équipement est indisponible du ${equipment.unavailableFrom?.toISOString().slice(0, 10)} au ${equipment.unavailableTo?.toISOString().slice(0, 10)}.`,
      );
    }
  }

  private async getProjectIdByTaskId(taskId: number): Promise<number> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        phase: {
          include: {
            project: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    return task.phase.project.id;
  }

  async create(createDto: CreateEquipementAssignmentDto) {
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

    const equipment = await this.prisma.equipment.findUnique({
      where: { id: createDto.equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException(
        `Equipment with ID ${createDto.equipmentId} not found`,
      );
    }

    this.validateEquipmentAvailability(equipment, startDate, endDate);

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

    if (equipment.tenantId !== taskTenantId) {
      throw new BadRequestException(
        'Equipment and Task must belong to the same tenant',
      );
    }

    const conflict = await this.equipmentAssignmentsRepository.findConflict(
      createDto.equipmentId,
      startDate,
      endDate,
    );

    if (conflict) {
      throw new BadRequestException(
        'Equipment is already assigned during this period',
      );
    }

    const data: Prisma.EquipmentAssignmentCreateInput = {
      startDate,
      endDate,
      notes: createDto.notes,
      equipment: {
        connect: {
          id: createDto.equipmentId,
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

    const created = await this.equipmentAssignmentsRepository.create(data);

    await this.projectBudgetsService.syncProjectBudgetDirectCosts(
      task.phase.project.id,
    );

    return created;
  }

  async findAll() {
    return this.equipmentAssignmentsRepository.findAll();
  }

  async findOne(id: number) {
    const assignment = await this.equipmentAssignmentsRepository.findById(id);

    if (!assignment) {
      throw new NotFoundException(
        `EquipmentAssignment with ID ${id} not found`,
      );
    }

    return assignment;
  }

  async findByTaskId(taskId: number) {
    return this.equipmentAssignmentsRepository.findByTaskId(taskId);
  }

  async findByEquipmentId(equipmentId: number) {
    return this.equipmentAssignmentsRepository.findByEquipmentId(equipmentId);
  }

  async update(id: number, updateDto: UpdateEquipementAssignmentDto) {
    const current = await this.findOne(id);

    const oldProjectId = await this.getProjectIdByTaskId(current.taskId);

    const nextEquipmentId = updateDto.equipmentId ?? current.equipmentId;
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
      throw new BadRequestException('Invalid startDate or endDate');
    }

    if (nextStartDate > nextEndDate) {
      throw new BadRequestException(
        'startDate must be less than or equal to endDate',
      );
    }

    const equipment = await this.prisma.equipment.findUnique({
      where: { id: nextEquipmentId },
    });

    if (!equipment) {
      throw new NotFoundException(
        `Equipment with ID ${nextEquipmentId} not found`,
      );
    }

    this.validateEquipmentAvailability(equipment, nextStartDate, nextEndDate);

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

    if (equipment.tenantId !== taskTenantId) {
      throw new BadRequestException(
        'Equipment and Task must belong to the same tenant',
      );
    }

    const conflict = await this.equipmentAssignmentsRepository.findConflict(
      nextEquipmentId,
      nextStartDate,
      nextEndDate,
      id,
    );

    if (conflict) {
      throw new BadRequestException(
        'Equipment is already assigned during this period',
      );
    }

    const data: Prisma.EquipmentAssignmentUpdateInput = {
      ...(updateDto.startDate !== undefined && {
        startDate: new Date(updateDto.startDate),
      }),
      ...(updateDto.endDate !== undefined && {
        endDate: new Date(updateDto.endDate),
      }),
      ...(updateDto.notes !== undefined && {
        notes: updateDto.notes,
      }),
      ...(updateDto.equipmentId !== undefined && {
        equipment: {
          connect: {
            id: updateDto.equipmentId,
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
        createdById: updateDto.createdById,
      }),
    };

    const updated = await this.equipmentAssignmentsRepository.update(id, data);

    const newProjectId = task.phase.project.id;

    await this.projectBudgetsService.syncProjectBudgetDirectCosts(newProjectId);

    if (oldProjectId !== newProjectId) {
      await this.projectBudgetsService.syncProjectBudgetDirectCosts(
        oldProjectId,
      );
    }

    return updated;
  }

  async remove(id: number) {
    const current = await this.findOne(id);

    const projectId = await this.getProjectIdByTaskId(current.taskId);

    const deleted = await this.equipmentAssignmentsRepository.delete(id);

    await this.projectBudgetsService.syncProjectBudgetDirectCosts(projectId);

    return deleted;
  }

  async getTasksByEquipmentId(
    equipmentId: number,
  ): Promise<EquipmentAssignedTaskResponseDto[]> {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id: equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException(`Équipement ${equipmentId} introuvable`);
    }

    const assignments =
      await this.equipmentAssignmentsRepository.findAssignmentsByEquipmentId(
        equipmentId,
      );

    return assignments.map((assignment) => ({
      assignmentId: assignment.id,
      taskId: assignment.taskId,
      taskName: assignment.task.name,
      startDate: assignment.startDate,
      endDate: assignment.endDate,
      notes: assignment.notes,
    }));
  }
}
