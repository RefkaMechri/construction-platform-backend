import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateMaterialDto } from '../dto/create-material.dto';
import { UpdateMaterialDto } from '../dto/update-material.dto';
import { MaterialRepository } from '../repositories/material.repository';

@Injectable()
export class MaterialService {
  constructor(private readonly materialRepository: MaterialRepository) {}

  async create(createMaterialDto: CreateMaterialDto) {
    try {
      const data: Prisma.MaterialCreateInput = {
        name: createMaterialDto.name,
        code: createMaterialDto.code,
        description: createMaterialDto.description,
        category: createMaterialDto.category,
        brand: createMaterialDto.brand,
        quantity: createMaterialDto.quantity ?? 0,
        unit: createMaterialDto.unit,
        quality: createMaterialDto.quality,
        status: createMaterialDto.status ?? 'ASSIGNED',
        notes: createMaterialDto.notes,
        tenant: {
          connect: {
            id: createMaterialDto.tenantId,
          },
        },
        ...(createMaterialDto.createdById && {
          createdBy: {
            connect: {
              id: createMaterialDto.createdById,
            },
          },
        }),
      };

      return await this.materialRepository.create(data);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll() {
    return this.materialRepository.findAll();
  }

  async findOne(id: number) {
    const material = await this.materialRepository.findById(id);

    if (!material) {
      throw new NotFoundException(`Material with ID ${id} not found`);
    }

    return material;
  }

  async update(id: number, updateMaterialDto: UpdateMaterialDto) {
    await this.findOne(id);

    try {
      const data: Prisma.MaterialUpdateInput = {
        ...(updateMaterialDto.name !== undefined && {
          name: updateMaterialDto.name,
        }),
        ...(updateMaterialDto.code !== undefined && {
          code: updateMaterialDto.code,
        }),
        ...(updateMaterialDto.description !== undefined && {
          description: updateMaterialDto.description,
        }),
        ...(updateMaterialDto.category !== undefined && {
          category: updateMaterialDto.category,
        }),
        ...(updateMaterialDto.brand !== undefined && {
          brand: updateMaterialDto.brand,
        }),
        ...(updateMaterialDto.quantity !== undefined && {
          quantity: updateMaterialDto.quantity,
        }),
        ...(updateMaterialDto.unit !== undefined && {
          unit: updateMaterialDto.unit,
        }),
        ...(updateMaterialDto.quality !== undefined && {
          quality: updateMaterialDto.quality,
        }),
        ...(updateMaterialDto.status !== undefined && {
          status: updateMaterialDto.status,
        }),
        ...(updateMaterialDto.notes !== undefined && {
          notes: updateMaterialDto.notes,
        }),
        ...(updateMaterialDto.tenantId !== undefined && {
          tenant: {
            connect: {
              id: updateMaterialDto.tenantId,
            },
          },
        }),
        ...(updateMaterialDto.createdById !== undefined && {
          createdBy: updateMaterialDto.createdById
            ? {
                connect: {
                  id: updateMaterialDto.createdById,
                },
              }
            : { disconnect: true },
        }),
      };

      return await this.materialRepository.update(id, data);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.materialRepository.delete(id);
  }

  private handlePrismaError(error: any): never {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (error?.code === 'P2002') {
      throw new ConflictException('Code already exists');
    }

    throw error;
  }
  async findResourcesByProject(projectId: number, tenantId: number) {
    if (!tenantId) {
      throw new BadRequestException("L'utilisateur n'est lié à aucun tenant.");
    }

    const materials =
      await this.materialRepository.findAllByTenantWithAssignmentsForProject(
        tenantId,
        projectId,
      );

    return materials.map((material) => {
      const assignedTasks = material.assignments.map((assignment) => ({
        assignmentId: assignment.id,
        taskId: assignment.task.id,
        id: assignment.task.id,
        name: assignment.task.name,
        quantity: assignment.quantity,
        startDate: assignment.startDate,
        status: assignment.status,
        notes: assignment.notes,
      }));

      const reservedAssignments = assignedTasks.filter(
        (task) => task.status === 'RESERVED' || task.status === 'WAITING_STOCK',
      );

      const reservedQuantity = reservedAssignments.reduce(
        (sum, task) => sum + task.quantity,
        0,
      );

      let availabilityStatus:
        | 'AVAILABLE'
        | 'IN_USE'
        | 'PARTIAL'
        | 'OUT_OF_STOCK' = 'AVAILABLE';

      if (material.quantity <= 0) {
        availabilityStatus = 'OUT_OF_STOCK';
      } else if (reservedQuantity > 0) {
        availabilityStatus = 'IN_USE';
      }

      return {
        id: material.id,
        name: material.name,
        status: material.status,
        availabilityStatus,
        availableQuantity: material.quantity,
        assignedTasks,
        createdAt: material.createdAt,
        updatedAt: material.updatedAt,
      };
    });
  }
}
