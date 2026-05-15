/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreateMaterialAssignmentDto } from '../dto/create-material-assignment.dto';
import { UpdateMaterialAssignmentDto } from '../dto/update-material-assignment.dto';
import { MaterialAssignmentsRepository } from '../repositories/material-assignments.repository';
import { MaterialAssignedTaskResponseDto } from '../dto/material-assigned-task-response.dto';
import { ProjectBudgetsService } from 'src/modules/project-budget/services/project-budgets.service';

@Injectable()
export class MaterialAssignmentsService {
  constructor(
    private readonly materialAssignmentsRepository: MaterialAssignmentsRepository,
    private readonly prisma: PrismaService,
    private readonly projectBudgetsService: ProjectBudgetsService,
  ) {}

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

  async create(createDto: CreateMaterialAssignmentDto) {
    if (createDto.quantity === undefined || createDto.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const material = await this.prisma.material.findUnique({
      where: { id: createDto.materialId },
    });

    if (!material) {
      throw new NotFoundException(
        `Material with ID ${createDto.materialId} not found`,
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

    if (!task.startDate) {
      throw new BadRequestException(
        'Task must have a startDate before assigning material',
      );
    }

    const taskTenantId = task.phase.project.tenantId;

    if (material.tenantId !== taskTenantId) {
      throw new BadRequestException(
        'Material and Task must belong to the same tenant',
      );
    }

    const data: Prisma.MaterialAssignmentCreateInput = {
      quantity: createDto.quantity,
      notes: createDto.notes,
      startDate: task.startDate,
      status: 'RESERVED',
      material: {
        connect: {
          id: createDto.materialId,
        },
      },
      task: {
        connect: {
          id: createDto.taskId,
        },
      },
    };

    const assignment = await this.materialAssignmentsRepository.create(data);

    await this.prisma.material.update({
      where: { id: createDto.materialId },
      data: {
        reservedQuantity: {
          increment: createDto.quantity,
        },
      },
    });

    await this.projectBudgetsService.syncProjectBudgetDirectCosts(
      task.phase.project.id,
    );

    return assignment;
  }

  async findAll() {
    return this.materialAssignmentsRepository.findAll();
  }

  async findOne(id: number) {
    const assignment = await this.materialAssignmentsRepository.findById(id);

    if (!assignment) {
      throw new NotFoundException(`MaterialAssignment with ID ${id} not found`);
    }

    return assignment;
  }

  async findByTaskId(taskId: number) {
    return this.materialAssignmentsRepository.findByTaskId(taskId);
  }

  async findByMaterialId(materialId: number) {
    return this.materialAssignmentsRepository.findByMaterialId(materialId);
  }

  async update(id: number, updateDto: UpdateMaterialAssignmentDto) {
    const current = await this.findOne(id);

    const oldProjectId = await this.getProjectIdByTaskId(current.taskId);

    const isTryingToChangeConsumedCoreData =
      current.status === 'CONSUMED' &&
      (updateDto.quantity !== undefined ||
        updateDto.materialId !== undefined ||
        updateDto.taskId !== undefined);

    if (isTryingToChangeConsumedCoreData) {
      throw new BadRequestException(
        'Consumed assignments can only update notes',
      );
    }

    const nextMaterialId = updateDto.materialId ?? current.materialId;
    const nextTaskId = updateDto.taskId ?? current.taskId;
    const nextQuantity = updateDto.quantity ?? current.quantity;

    if (nextQuantity === undefined || nextQuantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const material = await this.prisma.material.findUnique({
      where: { id: nextMaterialId },
    });

    if (!material) {
      throw new NotFoundException(
        `Material with ID ${nextMaterialId} not found`,
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

    if (!task.startDate) {
      throw new BadRequestException(
        'Task must have a startDate before assigning material',
      );
    }

    const taskTenantId = task.phase.project.tenantId;

    if (material.tenantId !== taskTenantId) {
      throw new BadRequestException(
        'Material and Task must belong to the same tenant',
      );
    }

    const data: Prisma.MaterialAssignmentUpdateInput = {
      ...(updateDto.quantity !== undefined && {
        quantity: updateDto.quantity,
      }),
      ...(updateDto.notes !== undefined && {
        notes: updateDto.notes,
      }),
      ...(updateDto.materialId !== undefined && {
        material: {
          connect: {
            id: updateDto.materialId,
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
      ...(updateDto.taskId !== undefined && {
        startDate: task.startDate,
      }),
    };

    const updatedAssignment = await this.materialAssignmentsRepository.update(
      id,
      data,
    );

    if (current.status === 'RESERVED') {
      if (nextMaterialId !== current.materialId) {
        await this.prisma.material.update({
          where: { id: current.materialId },
          data: {
            reservedQuantity: {
              decrement: current.quantity,
            },
          },
        });

        await this.prisma.material.update({
          where: { id: nextMaterialId },
          data: {
            reservedQuantity: {
              increment: nextQuantity,
            },
          },
        });
      } else {
        const quantityDifference = nextQuantity - current.quantity;

        if (quantityDifference > 0) {
          await this.prisma.material.update({
            where: { id: current.materialId },
            data: {
              reservedQuantity: {
                increment: quantityDifference,
              },
            },
          });
        } else if (quantityDifference < 0) {
          await this.prisma.material.update({
            where: { id: current.materialId },
            data: {
              reservedQuantity: {
                decrement: Math.abs(quantityDifference),
              },
            },
          });
        }
      }
    }

    const newProjectId = task.phase.project.id;

    await this.projectBudgetsService.syncProjectBudgetDirectCosts(newProjectId);

    if (oldProjectId !== newProjectId) {
      await this.projectBudgetsService.syncProjectBudgetDirectCosts(
        oldProjectId,
      );
    }

    return updatedAssignment;
  }

  async remove(id: number) {
    const assignment = await this.findOne(id);

    const projectId = await this.getProjectIdByTaskId(assignment.taskId);

    if (assignment.status === 'RESERVED') {
      await this.prisma.material.update({
        where: { id: assignment.materialId },
        data: {
          reservedQuantity: {
            decrement: assignment.quantity,
          },
        },
      });
    }

    const deleted = await this.materialAssignmentsRepository.delete(id);

    await this.projectBudgetsService.syncProjectBudgetDirectCosts(projectId);

    return deleted;
  }

  async getTasksByMaterialId(
    materialId: number,
  ): Promise<MaterialAssignedTaskResponseDto[]> {
    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      throw new NotFoundException(`Matériel ${materialId} introuvable`);
    }

    const assignments =
      await this.materialAssignmentsRepository.findAssignmentsByMaterialId(
        materialId,
      );

    return assignments.map((assignment) => ({
      assignmentId: assignment.id,
      taskId: assignment.taskId,
      taskName: assignment.task.name,
      quantity: assignment.quantity,
      startDate: assignment.startDate,
      status: assignment.status,
      notes: assignment.notes,
    }));
  }
  private ensureSiteManager(currentUser: any) {
    if (!currentUser) {
      throw new ForbiddenException('Utilisateur non authentifié.');
    }
  }
  async updateTaskMaterialUsage(
    projectId: number,
    taskId: number,
    assignmentId: number,
    usedQuantity: number,
    user: any,
  ) {
    this.ensureSiteManager(user);

    const assignment =
      await this.materialAssignmentsRepository.findMaterialAssignmentInAssignedProjectTask(
        projectId,
        taskId,
        assignmentId,
        Number(user.id),
      );

    if (!assignment) {
      throw new NotFoundException(
        'Matériau introuvable ou non lié à cette tâche.',
      );
    }

    const assignedQuantity = Number(assignment.quantity);
    const numericUsedQuantity = Number(usedQuantity);

    if (Number.isNaN(numericUsedQuantity)) {
      throw new BadRequestException('Quantité utilisée invalide.');
    }

    if (numericUsedQuantity < 0) {
      throw new BadRequestException(
        'La quantité utilisée ne peut pas être négative.',
      );
    }

    let status = 'RESERVED';

    if (numericUsedQuantity === 0) {
      status = 'RESERVED';
    } else if (numericUsedQuantity < assignedQuantity) {
      status = 'PARTIALLY_USED';
    } else if (numericUsedQuantity === assignedQuantity) {
      status = 'USED';
    } else {
      status = 'OVER_USED';
    }

    return this.materialAssignmentsRepository.updateMaterialAssignmentUsage(
      assignmentId,
      numericUsedQuantity,
      status,
    );
  }
}
