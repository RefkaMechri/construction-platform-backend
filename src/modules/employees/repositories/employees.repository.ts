import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';

@Injectable()
export class EmployeesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEmployeeDto) {
    return this.prisma.employee.create({
      data: {
        name: dto.name,
        email: dto.email?.trim().toLowerCase() || null,
        phone: dto.phone || null,
        jobTitle: dto.jobTitle,
        skills: dto.skills || [],
        status: dto.status || 'ACTIVE',
        availabilityStatus: dto.availabilityStatus || 'AVAILABLE',
        unavailableFrom: dto.unavailableFrom
          ? new Date(dto.unavailableFrom)
          : null,
        unavailableTo: dto.unavailableTo ? new Date(dto.unavailableTo) : null,
        unavailabilityNote: dto.unavailabilityNote?.trim() || null,
        tenantId: dto.tenantId,
        createdById: dto.createdById || null,
      },
    });
  }

  async findAllByTenant(tenantId: number) {
    return this.prisma.employee.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.employee.findUnique({
      where: { id },
    });
  }

  async update(id: number, dto: UpdateEmployeeDto) {
    if (
      dto.unavailableFrom &&
      dto.unavailableTo &&
      new Date(dto.unavailableFrom) > new Date(dto.unavailableTo)
    ) {
      throw new BadRequestException(
        "La date de début d'indisponibilité doit être antérieure à la date de fin.",
      );
    }

    return this.prisma.employee.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && {
          email: dto.email ? dto.email.trim().toLowerCase() : null,
        }),
        ...(dto.phone !== undefined && { phone: dto.phone || null }),
        ...(dto.jobTitle !== undefined && { jobTitle: dto.jobTitle }),
        ...(dto.skills !== undefined && { skills: dto.skills }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.availabilityStatus !== undefined && {
          availabilityStatus: dto.availabilityStatus,
        }),
        ...(dto.unavailableFrom !== undefined && {
          unavailableFrom: dto.unavailableFrom
            ? new Date(dto.unavailableFrom)
            : null,
        }),
        ...(dto.unavailableTo !== undefined && {
          unavailableTo: dto.unavailableTo ? new Date(dto.unavailableTo) : null,
        }),
        ...(dto.unavailabilityNote !== undefined && {
          unavailabilityNote: dto.unavailabilityNote?.trim() || null,
        }),
      },
    });
  }

  async remove(id: number) {
    return this.prisma.employee.delete({
      where: { id },
    });
  }
  async findAllByTenantWithAssignmentsForProject(
    tenantId: number,
    projectId: number,
  ) {
    return this.prisma.employee.findMany({
      where: {
        tenantId,
      },
      include: {
        assignments: {
          where: {
            task: {
              phase: {
                projectId,
              },
            },
          },
          include: {
            task: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  async findByIdWithAssignments(id: number) {
    return this.prisma.employee.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            task: true,
          },
          orderBy: {
            startDate: 'asc',
          },
        },
      },
    });
  }
}
