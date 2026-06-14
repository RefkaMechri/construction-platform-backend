/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
import { MailService } from '../../../shared/mail/mail.service';

type TenantPlanValue = 'Basic' | 'Pro' | 'Enterprise';

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}
  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');
  }

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
        projects: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant introuvable');

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: {
        name: tenant.plan,
      },
      select: {
        usersLimit: true,
        projectsLimit: true,
      },
    });

    const usersCount = tenant.users.length;
    const projectsCount = tenant.projects.length;

    const admin = tenant.users.find((user) => user.role === 'ADMIN') ?? null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { projects, ...tenantWithoutProjects } = tenant;

    return {
      tenant: {
        ...tenantWithoutProjects,
        usage: {
          users: {
            count: usersCount,
            limit: plan?.usersLimit ?? 'illimité',
            display: `${usersCount}/${plan?.usersLimit ?? 'illimité'}`,
          },
          projects: {
            count: projectsCount,
            limit: plan?.projectsLimit ?? 'illimité',
            display: `${projectsCount}/${plan?.projectsLimit ?? 'illimité'}`,
          },
        },
      },
      admin,
    };
  }

  async create(dto: CreateTenantDto) {
    try {
      const tenantEmail = dto.email.trim().toLowerCase();
      const slug = dto.slug?.trim().length
        ? dto.slug.trim()
        : this.slugify(dto.name);

      const adminName = `${dto.name} Admin`;
      const adminEmail = tenantEmail;
      const temporaryPassword = `${dto.name.trim().replace(/\s+/g, '')}@Admin123`;
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      const result = await this.prisma.$transaction(async (tx) => {
        // 1) Créer le tenant
        const tenant = await tx.tenant.create({
          data: {
            name: dto.name,
            slug,
            email: tenantEmail,
            phone: dto.phone?.trim() ? dto.phone.trim() : null,
            country: dto.country?.trim() ? dto.country.trim() : null,
            address: dto.address?.trim() ? dto.address.trim() : null,
            plan: dto.plan as any,
            status: (dto.status ?? 'ACTIVE') as any,
            modules: this.getModulesByPlan(dto.plan),
          },
        });

        // 2) Créer l'admin du tenant
        const adminUser = await tx.user.create({
          data: {
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
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
      await this.mailService.sendTenantAdminCredentials(
        adminName,
        adminEmail,
        temporaryPassword,
        result.tenant.name,
      );

      return {
        message:
          'Tenant et admin créés avec succès, identifiants envoyés par email.',
        tenant: result.tenant,
        adminUser: result.adminUser,
      };
    } catch (error: any) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target =
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          (error.meta as any)?.target?.join?.(', ') ?? 'champ unique';
        throw new ConflictException(`Conflit: ${target} déjà utilisé.`);
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
  async getTenantDetails(id: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          where: { role: Role.ADMIN },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
          take: 1,
        },
        _count: {
          select: {
            users: true,
            projects: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant introuvable');
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: {
        name: tenant.plan,
      },
      select: {
        usersLimit: true,
        projectsLimit: true,
      },
    });

    const usersCount = tenant._count.users;
    const projectsCount = tenant._count.projects;

    const usersLimit = plan?.usersLimit ?? 'illimité';
    const projectsLimit = plan?.projectsLimit ?? 'illimité';

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: (tenant as any).slug ?? null,
        email: tenant.email,
        phone: (tenant as any).phone ?? null,
        country: (tenant as any).country ?? null,
        address: (tenant as any).address ?? null,
        plan: tenant.plan,
        status: tenant.status,
        modules: tenant.modules,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,

        usage: {
          users: {
            count: usersCount,
            limit: usersLimit,
            display: `${usersCount}/${usersLimit}`,
          },
          projects: {
            count: projectsCount,
            limit: projectsLimit,
            display: `${projectsCount}/${projectsLimit}`,
          },
        },
      },
      admin: tenant.users[0] ?? null,
    };
  }
  async resetAdminPassword(id: number) {
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
