/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import * as bcrypt from 'bcryptjs';
import { Prisma, Role } from '@prisma/client';

type TenantPlanValue = 'Basic' | 'Pro' | 'Enterprise';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  private getModulesByPlan(plan: TenantPlanValue) {
    if (plan === 'Enterprise') return ['Planning', 'Coût', 'Ressources'];
    if (plan === 'Pro') return ['Planning', 'Ressources'];
    return ['Planning'];
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant introuvable');
    return tenant;
  }

  async create(dto: CreateTenantDto) {
    try {
      // ✅ Règles automatiques
      const adminName = `${dto.name} Admin`;
      const adminEmail = dto.email; // même email que tenant
      const temporaryPassword = `${dto.name.trim().replace(/\s+/g, '')}@Admin123`;
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
      console.log('dto.name:', JSON.stringify(dto.name));
      console.log('temporaryPassword:', JSON.stringify(temporaryPassword));
      const result = await this.prisma.$transaction(async (tx) => {
        // 1) Create tenant
        const tenant = await tx.tenant.create({
          data: {
            name: dto.name,
            email: dto.email,
            phone: dto.phone,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            plan: dto.plan as any,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            status: dto.status as any,
            modules: this.getModulesByPlan(dto.plan),
          },
        });

        // 2) Create tenant admin user (same email)
        const adminUser = await tx.user.create({
          data: {
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            role: Role.ADMIN,
            tenantId: tenant.id,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            tenantId: true,
            createdAt: true,
          },
        });

        return { tenant, adminUser };
      });

      return {
        message: 'Tenant et admin créés avec succès',
        tenant: result.tenant,
        adminUser: result.adminUser,
        credentials: {
          email: adminEmail,
          temporaryPassword,
        },
      };
    } catch (error: any) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Email déjà utilisé (tenant ou utilisateur admin)',
        );
      }

      throw error;
    }
  }

  async update(id: number, dto: UpdateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tenant introuvable');

    const nextPlan = dto.plan ?? existing.plan;

    return this.prisma.tenant.update({
      where: { id },
      data: {
        ...dto,
        modules: dto.plan
          ? this.getModulesByPlan(nextPlan as TenantPlanValue)
          : undefined,
      },
    });
  }

  async remove(id: number) {
    const existing = await this.prisma.tenant.findUnique({
      where: { id },
      include: { users: true },
    });

    if (!existing) throw new NotFoundException('Tenant introuvable');

    await this.prisma.$transaction(async (tx) => {
      await tx.user.deleteMany({ where: { tenantId: id } });
      await tx.tenant.delete({ where: { id } });
    });

    return { message: 'Tenant et ses utilisateurs supprimés avec succès' };
  }
}
