import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
type EmployeeLite = {
  id: number;
  name: string;
  jobTitle: string;
  availabilityStatus: string;
};

type EquipmentLite = {
  id: number;
  name: string;
  code: string | null;
  category: string;
  availabilityStatus: string;
};
@Injectable()
export class ResourceDashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  countEmployees(tenantId: number) {
    return this.prisma.employee.count({
      where: { tenantId },
    });
  }

  countEmployeesByAvailability(tenantId: number) {
    return this.prisma.employee.groupBy({
      by: ['availabilityStatus'],
      where: { tenantId },
      _count: { availabilityStatus: true },
    });
  }

  countEmployeesByJobTitle(tenantId: number) {
    return this.prisma.employee.groupBy({
      by: ['jobTitle'],
      where: { tenantId },
      _count: { jobTitle: true },
      orderBy: {
        _count: {
          jobTitle: 'desc',
        },
      },
    });
  }

  getEmployeeSkills(tenantId: number) {
    return this.prisma.employee.findMany({
      where: { tenantId },
      select: {
        id: true,
        skills: true,
      },
    });
  }

  getUnavailableEmployees(tenantId: number) {
    return this.prisma.employee.findMany({
      where: {
        tenantId,
        OR: [
          { availabilityStatus: { not: 'AVAILABLE' } },
          { status: { not: 'ACTIVE' } },
        ],
      },
      take: 8,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        jobTitle: true,
        availabilityStatus: true,
        unavailableFrom: true,
        unavailableTo: true,
        unavailabilityNote: true,
      },
    });
  }

  getTopBusyEmployees(tenantId: number) {
    return this.prisma.employeeAssignment.groupBy({
      by: ['employeeId'],
      where: {
        employee: {
          tenantId,
        },
      },
      _count: {
        employeeId: true,
      },
      orderBy: {
        _count: {
          employeeId: 'desc',
        },
      },
      take: 8,
    });
  }

  async getEmployeesByIds(ids: number[]): Promise<EmployeeLite[]> {
  if (!ids.length) return [];

  return this.prisma.employee.findMany({
    where: {
      id: {
        in: ids,
      },
    },
    select: {
      id: true,
      name: true,
      jobTitle: true,
      availabilityStatus: true,
    },
  });
  }

  countEquipments(tenantId: number) {
    return this.prisma.equipment.count({
      where: { tenantId },
    });
  }

  countEquipmentsByAvailability(tenantId: number) {
    return this.prisma.equipment.groupBy({
      by: ['availabilityStatus'],
      where: { tenantId },
      _count: { availabilityStatus: true },
    });
  }

  countEquipmentsByCategory(tenantId: number) {
    return this.prisma.equipment.groupBy({
      by: ['category'],
      where: { tenantId },
      _count: { category: true },
      orderBy: {
        _count: {
          category: 'desc',
        },
      },
    });
  }

  countEquipmentsByOwnershipType(tenantId: number) {
    return this.prisma.equipment.groupBy({
      by: ['ownershipType'],
      where: { tenantId },
      _count: { ownershipType: true },
    });
  }

  countEquipmentsByCondition(tenantId: number) {
    return this.prisma.equipment.groupBy({
      by: ['condition'],
      where: { tenantId },
      _count: { condition: true },
    });
  }

  getUnavailableEquipments(tenantId: number) {
    return this.prisma.equipment.findMany({
      where: {
        tenantId,
        OR: [
          { availabilityStatus: { not: 'AVAILABLE' } },
          { status: { not: 'ACTIVE' } },
        ],
      },
      take: 8,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        code: true,
        category: true,
        condition: true,
        availabilityStatus: true,
        unavailableFrom: true,
        unavailableTo: true,
        unavailabilityNote: true,
      },
    });
  }

  getMostUsedEquipments(tenantId: number) {
    return this.prisma.equipmentAssignment.groupBy({
      by: ['equipmentId'],
      where: {
        equipment: {
          tenantId,
        },
      },
      _count: {
        equipmentId: true,
      },
      orderBy: {
        _count: {
          equipmentId: 'desc',
        },
      },
      take: 8,
    });
  }

  async getEquipmentsByIds(ids: number[]): Promise<EquipmentLite[]> {
  if (!ids.length) return [];

  return this.prisma.equipment.findMany({
    where: {
      id: {
        in: ids,
      },
    },
    select: {
      id: true,
      name: true,
      code: true,
      category: true,
      availabilityStatus: true,
    },
  });
  }

  countMaterials(tenantId: number) {
    return this.prisma.material.count({
      where: { tenantId },
    });
  }

  countMaterialsByAvailability(tenantId: number) {
    return this.prisma.material.groupBy({
      by: ['availabilityStatus'],
      where: { tenantId },
      _count: { availabilityStatus: true },
    });
  }

  countMaterialsByCategory(tenantId: number) {
    return this.prisma.material.groupBy({
      by: ['category'],
      where: { tenantId },
      _count: { category: true },
      orderBy: {
        _count: {
          category: 'desc',
        },
      },
    });
  }

  getMaterialsStockSummary(tenantId: number) {
    return this.prisma.material.aggregate({
      where: { tenantId },
      _sum: {
        quantity: true,
        reservedQuantity: true,
      },
    });
  }

  getCriticalStockMaterials(tenantId: number) {
    return this.prisma.material.findMany({
      where: {
        tenantId,
        quantity: {
          lte: 10,
        },
      },
      orderBy: {
        quantity: 'asc',
      },
      take: 10,
      select: {
        id: true,
        name: true,
        code: true,
        category: true,
        quantity: true,
        reservedQuantity: true,
        unit: true,
        unitPrice: true,
        availabilityStatus: true,
      },
    });
  }

  getTopStockMaterials(tenantId: number) {
    return this.prisma.material.findMany({
      where: { tenantId },
      orderBy: {
        quantity: 'desc',
      },
      take: 10,
      select: {
        id: true,
        name: true,
        category: true,
        quantity: true,
        reservedQuantity: true,
        unit: true,
        unitPrice: true,
      },
    });
  }

  getMaterialsForStockValue(tenantId: number) {
    return this.prisma.material.findMany({
      where: { tenantId },
      select: {
        quantity: true,
        unitPrice: true,
      },
    });
  }

  countActiveEmployeeAssignments(tenantId: number, today: Date) {
    return this.prisma.employeeAssignment.count({
      where: {
        employee: { tenantId },
        startDate: { lte: today },
        endDate: { gte: today },
      },
    });
  }

  countActiveEquipmentAssignments(tenantId: number, today: Date) {
    return this.prisma.equipmentAssignment.count({
      where: {
        equipment: { tenantId },
        startDate: { lte: today },
        endDate: { gte: today },
      },
    });
  }

  countActiveMaterialAssignments(tenantId: number) {
    return this.prisma.materialAssignment.count({
      where: {
        material: { tenantId },
        status: 'RESERVED',
      },
    });
  }

  getUpcomingEmployeeAssignments(tenantId: number, today: Date) {
    return this.prisma.employeeAssignment.findMany({
      where: {
        employee: { tenantId },
        startDate: { gte: today },
      },
      take: 8,
      orderBy: { startDate: 'asc' },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        employee: {
          select: {
            id: true,
            name: true,
            jobTitle: true,
          },
        },
        task: {
          select: {
            id: true,
            name: true,
            phase: {
              select: {
                project: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  getUpcomingEquipmentAssignments(tenantId: number, today: Date) {
    return this.prisma.equipmentAssignment.findMany({
      where: {
        equipment: { tenantId },
        startDate: { gte: today },
      },
      take: 8,
      orderBy: { startDate: 'asc' },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        equipment: {
          select: {
            id: true,
            name: true,
            code: true,
            category: true,
          },
        },
        task: {
          select: {
            id: true,
            name: true,
            phase: {
              select: {
                project: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  getUpcomingMaterialAssignments(tenantId: number) {
    return this.prisma.materialAssignment.findMany({
      where: {
        material: { tenantId },
        status: 'RESERVED',
      },
      take: 8,
      orderBy: { startDate: 'asc' },
      select: {
        id: true,
        quantity: true,
        usedQuantity: true,
        startDate: true,
        status: true,
        material: {
          select: {
            id: true,
            name: true,
            code: true,
            unit: true,
            category: true,
          },
        },
        task: {
          select: {
            id: true,
            name: true,
            phase: {
              select: {
                project: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  getEmployeesDailyCost(tenantId: number) {
    return this.prisma.employee.aggregate({
      where: { tenantId },
      _sum: {
        dailyCost: true,
      },
    });
  }

  getEquipmentsDailyCost(tenantId: number) {
    return this.prisma.equipment.aggregate({
      where: { tenantId },
      _sum: {
        dailyCost: true,
      },
    });
  }

  getAssignmentsByProject(tenantId: number) {
    return this.prisma.project.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        code: true,
        phases: {
          select: {
            tasks: {
              select: {
                assignments: {
                  select: { id: true },
                },
                assignmentsEq: {
                  select: { id: true },
                },
                assignmentsMt: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
      take: 10,
    });
  }

  getActiveAssignmentsTrend(tenantId: number) {
    return this.prisma.$queryRaw`
      SELECT
        TO_CHAR(ea."startDate", 'YYYY-MM') AS month,
        COUNT(ea.id)::int AS employees,
        0::int AS equipments,
        0::int AS materials
      FROM "EmployeeAssignment" ea
      JOIN "Employee" e ON e.id = ea."employeeId"
      WHERE e."tenantId" = ${tenantId}
      GROUP BY month

      UNION ALL

      SELECT
        TO_CHAR(eq."startDate", 'YYYY-MM') AS month,
        0::int AS employees,
        COUNT(eq.id)::int AS equipments,
        0::int AS materials
      FROM "EquipmentAssignment" eq
      JOIN "Equipment" em ON em.id = eq."equipmentId"
      WHERE em."tenantId" = ${tenantId}
      GROUP BY month

      UNION ALL

      SELECT
        TO_CHAR(ma."startDate", 'YYYY-MM') AS month,
        0::int AS employees,
        0::int AS equipments,
        COUNT(ma.id)::int AS materials
      FROM "MaterialAssignment" ma
      JOIN "Material" m ON m.id = ma."materialId"
      WHERE m."tenantId" = ${tenantId}
      GROUP BY month
    `;
  }

  countUnreadNotifications(userId: number) {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  getLatestNotifications(userId: number) {
    return this.prisma.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 8,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        severity: true,
        sourceType: true,
        sourceId: true,
        isRead: true,
        createdAt: true,
      },
    });
  }

  countNotificationsBySeverity(userId: number) {
    return this.prisma.notification.groupBy({
      by: ['severity'],
      where: {
        userId,
        isRead: false,
      },
      _count: {
        severity: true,
      },
    });
  }
}
