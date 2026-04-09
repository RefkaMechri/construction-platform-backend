import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EmployeesRepository } from '../repositories/employees.repository';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly employeesRepository: EmployeesRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateEmployeeDto) {
    try {
      return await this.employeesRepository.create(dto);
    } catch (error: any) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email déjà utilisé.');
      }

      throw error;
    }
  }

  async findAllByTenant(tenantId: number) {
    return this.employeesRepository.findAllByTenant(tenantId);
  }

  async findOne(id: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        tenant: true,
        createdBy: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employé introuvable');
    }

    return employee;
  }

  async update(id: number, dto: UpdateEmployeeDto) {
    await this.findOne(id);
    return this.employeesRepository.update(id, dto);
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.employeesRepository.remove(id);
  }
}
