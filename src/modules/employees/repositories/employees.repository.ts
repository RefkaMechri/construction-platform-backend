import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
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
      },
    });
  }

  async remove(id: number) {
    return this.prisma.employee.delete({
      where: { id },
    });
  }
}
