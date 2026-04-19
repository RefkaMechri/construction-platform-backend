import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateEquipmentDto } from '../dto/create-equipment.dto';
import { UpdateEquipmentDto } from '../dto/update-equipment.dto';
import { EquipmentRepository } from '../repositories/equipment.repository';
import { UpdateEquipmentDailyCostDto } from '../dto/update-equipment-daily-cost.dto';

@Injectable()
export class EquipmentService {
  constructor(private readonly equipmentRepository: EquipmentRepository) {}

  async create(createEquipmentDto: CreateEquipmentDto) {
    try {
      if (
        createEquipmentDto.unavailableFrom &&
        createEquipmentDto.unavailableTo &&
        new Date(createEquipmentDto.unavailableFrom) >
          new Date(createEquipmentDto.unavailableTo)
      ) {
        throw new BadRequestException(
          "La date de début d'indisponibilité doit être antérieure à la date de fin.",
        );
      }

      const data: Prisma.EquipmentCreateInput = {
        name: createEquipmentDto.name,
        code: createEquipmentDto.code,
        description: createEquipmentDto.description,
        category: createEquipmentDto.category,
        brand: createEquipmentDto.brand,
        model: createEquipmentDto.model,
        serialNumber: createEquipmentDto.serialNumber,
        yearOfManufacture: createEquipmentDto.yearOfManufacture,
        quantity: createEquipmentDto.quantity ?? 1,
        unit: createEquipmentDto.unit,
        capacity: createEquipmentDto.capacity,
        status: createEquipmentDto.status ?? 'ACTIVE',
        availabilityStatus:
          createEquipmentDto.availabilityStatus ?? 'AVAILABLE',

        unavailableFrom: createEquipmentDto.unavailableFrom
          ? new Date(createEquipmentDto.unavailableFrom)
          : undefined,
        unavailableTo: createEquipmentDto.unavailableTo
          ? new Date(createEquipmentDto.unavailableTo)
          : undefined,
        unavailabilityNote:
          createEquipmentDto.unavailabilityNote?.trim() || undefined,

        condition: createEquipmentDto.condition,
        ownershipType: createEquipmentDto.ownershipType,
        purchaseDate: createEquipmentDto.purchaseDate
          ? new Date(createEquipmentDto.purchaseDate)
          : undefined,

        tenant: {
          connect: {
            id: createEquipmentDto.tenantId,
          },
        },

        ...(createEquipmentDto.createdById && {
          createdBy: {
            connect: {
              id: createEquipmentDto.createdById,
            },
          },
        }),
      };

      return await this.equipmentRepository.create(data);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll() {
    return this.equipmentRepository.findAll();
  }

  async findOne(id: number) {
    const equipment = await this.equipmentRepository.findById(id);

    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${id} not found`);
    }

    return equipment;
  }

  async update(id: number, updateEquipmentDto: UpdateEquipmentDto) {
    await this.findOne(id);

    try {
      if (
        updateEquipmentDto.unavailableFrom &&
        updateEquipmentDto.unavailableTo &&
        new Date(updateEquipmentDto.unavailableFrom) >
          new Date(updateEquipmentDto.unavailableTo)
      ) {
        throw new BadRequestException(
          "La date de début d'indisponibilité doit être antérieure à la date de fin.",
        );
      }

      const data: Prisma.EquipmentUpdateInput = {
        ...(updateEquipmentDto.name !== undefined && {
          name: updateEquipmentDto.name,
        }),
        ...(updateEquipmentDto.code !== undefined && {
          code: updateEquipmentDto.code || null,
        }),
        ...(updateEquipmentDto.description !== undefined && {
          description: updateEquipmentDto.description || null,
        }),
        ...(updateEquipmentDto.category !== undefined && {
          category: updateEquipmentDto.category,
        }),
        ...(updateEquipmentDto.brand !== undefined && {
          brand: updateEquipmentDto.brand || null,
        }),
        ...(updateEquipmentDto.model !== undefined && {
          model: updateEquipmentDto.model || null,
        }),
        ...(updateEquipmentDto.serialNumber !== undefined && {
          serialNumber: updateEquipmentDto.serialNumber || null,
        }),
        ...(updateEquipmentDto.yearOfManufacture !== undefined && {
          yearOfManufacture: updateEquipmentDto.yearOfManufacture ?? null,
        }),
        ...(updateEquipmentDto.quantity !== undefined && {
          quantity: updateEquipmentDto.quantity,
        }),
        ...(updateEquipmentDto.unit !== undefined && {
          unit: updateEquipmentDto.unit || null,
        }),
        ...(updateEquipmentDto.capacity !== undefined && {
          capacity: updateEquipmentDto.capacity || null,
        }),
        ...(updateEquipmentDto.status !== undefined && {
          status: updateEquipmentDto.status,
        }),
        ...(updateEquipmentDto.availabilityStatus !== undefined && {
          availabilityStatus: updateEquipmentDto.availabilityStatus,
        }),

        ...(updateEquipmentDto.unavailableFrom !== undefined && {
          unavailableFrom: updateEquipmentDto.unavailableFrom
            ? new Date(updateEquipmentDto.unavailableFrom)
            : null,
        }),
        ...(updateEquipmentDto.unavailableTo !== undefined && {
          unavailableTo: updateEquipmentDto.unavailableTo
            ? new Date(updateEquipmentDto.unavailableTo)
            : null,
        }),
        ...(updateEquipmentDto.unavailabilityNote !== undefined && {
          unavailabilityNote:
            updateEquipmentDto.unavailabilityNote?.trim() || null,
        }),

        ...(updateEquipmentDto.condition !== undefined && {
          condition: updateEquipmentDto.condition || null,
        }),
        ...(updateEquipmentDto.ownershipType !== undefined && {
          ownershipType: updateEquipmentDto.ownershipType || null,
        }),
        ...(updateEquipmentDto.purchaseDate !== undefined && {
          purchaseDate: updateEquipmentDto.purchaseDate
            ? new Date(updateEquipmentDto.purchaseDate)
            : null,
        }),
        ...(updateEquipmentDto.tenantId !== undefined && {
          tenant: {
            connect: {
              id: updateEquipmentDto.tenantId,
            },
          },
        }),
        ...(updateEquipmentDto.createdById !== undefined && {
          createdBy: updateEquipmentDto.createdById
            ? {
                connect: {
                  id: updateEquipmentDto.createdById,
                },
              }
            : { disconnect: true },
        }),
      };

      return await this.equipmentRepository.update(id, data);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }
  async remove(id: number) {
    await this.findOne(id);
    return this.equipmentRepository.delete(id);
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

    const equipments =
      await this.equipmentRepository.findAllByTenantWithAssignmentsForProject(
        tenantId,
        projectId,
      );

    return equipments.map((equipment) => {
      const assignedTasks = equipment.assignments.map((assignment) => ({
        assignmentId: assignment.id,
        taskId: assignment.task.id,
        id: assignment.task.id,
        name: assignment.task.name,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
      }));

      const allocation = assignedTasks.length > 0 ? 100 : 0;

      const availabilityStatus =
        assignedTasks.length === 0 ? 'AVAILABLE' : 'IN_USE';

      return {
        id: equipment.id,
        name: equipment.name,
        status: equipment.status,
        availabilityStatus,
        allocation,
        assignedTasks,
        createdAt: equipment.createdAt,
        updatedAt: equipment.updatedAt,
      };
    });
  }
  async updateDailyCost(id: number, dto: UpdateEquipmentDailyCostDto) {
    const equipment = await this.equipmentRepository.findOne(id);

    if (!equipment) {
      throw new NotFoundException('Équipement introuvable');
    }

    return this.equipmentRepository.updateDailyCost(id, dto.dailyCost);
  }
}
