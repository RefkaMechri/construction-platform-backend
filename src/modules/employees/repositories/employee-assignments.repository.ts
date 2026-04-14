import { Injectable } from '@nestjs/common';
import { EmployeeAssignment, Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class EmployeeAssignmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.EmployeeAssignmentCreateInput,
  ): Promise<EmployeeAssignment> {
    return this.prisma.employeeAssignment.create({
      data,
      include: {
        employee: true,
        task: true,
      },
    });
  }

  async findAll(): Promise<EmployeeAssignment[]> {
    return this.prisma.employeeAssignment.findMany({
      include: {
        employee: true,
        task: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: number): Promise<EmployeeAssignment | null> {
    return this.prisma.employeeAssignment.findUnique({
      where: { id },
      include: {
        employee: true,
        task: true,
      },
    });
  }

  async findByTaskId(taskId: number): Promise<EmployeeAssignment[]> {
    return this.prisma.employeeAssignment.findMany({
      where: { taskId },
      include: {
        employee: true,
        task: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  async findByEmployeeId(employeeId: number): Promise<EmployeeAssignment[]> {
    return this.prisma.employeeAssignment.findMany({
      where: { employeeId },
      include: {
        employee: true,
        task: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    });
  }

  async findConflict(
    employeeId: number,
    startDate: Date,
    endDate: Date,
    excludeId?: number,
  ): Promise<EmployeeAssignment | null> {
    return this.prisma.employeeAssignment.findFirst({
      where: {
        employeeId,
        ...(excludeId !== undefined && {
          id: {
            not: excludeId,
          },
        }),
        startDate: {
          lt: endDate,
        },
        endDate: {
          gt: startDate,
        },
      },
      include: {
        employee: true,
        task: true,
      },
    });
  }

  async update(
    id: number,
    data: Prisma.EmployeeAssignmentUpdateInput,
  ): Promise<EmployeeAssignment> {
    return this.prisma.employeeAssignment.update({
      where: { id },
      data,
      include: {
        employee: true,
        task: true,
      },
    });
  }

  async delete(id: number): Promise<EmployeeAssignment> {
    return this.prisma.employeeAssignment.delete({
      where: { id },
      include: {
        employee: true,
        task: true,
      },
    });
  }
  async findAssignmentsByEmployeeId(employeeId: number) {
    return this.prisma.employeeAssignment.findMany({
      where: { employeeId },
      include: {
        task: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }
}
