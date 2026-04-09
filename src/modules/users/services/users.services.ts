/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { UsersRepository } from '../repositories/users.repository';
import { MailService } from '../../../shared/mail/mail.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
  ) {}

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');
  }

  async create(dto: CreateUserDto) {
    try {
      console.log('📥 DTO reçu dans create user:', dto);

      if (!dto.tenantId) {
        throw new BadRequestException('tenantId est requis');
      }

      if (!dto.email?.trim()) {
        throw new BadRequestException('Email requis');
      }

      if (!dto.name?.trim()) {
        throw new BadRequestException('Nom requis');
      }

      const email = dto.email.trim().toLowerCase();
      const name = dto.name.trim();
      const status = dto.status?.trim() || 'ACTIVE';

      console.log('📌 Données normalisées:', {
        name,
        email,
        role: dto.role,
        tenantId: dto.tenantId,
        status,
      });

      const temporaryPassword = `${name.replace(/\s+/g, '')}@User123`;
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      const result = await this.prisma.$transaction(async (tx) => {
        // 1) Vérifier si le tenant existe
        const tenant = await tx.tenant.findUnique({
          where: { id: dto.tenantId },
          select: {
            id: true,
            plan: true,
            modules: true,
          },
        });

        console.log('🏢 Tenant trouvé:', tenant);

        if (!tenant) {
          throw new NotFoundException('Entreprise introuvable');
        }

        // 2) Vérifier si le plan / abonnement existe
        const subscription = await tx.subscriptionPlan.findUnique({
          where: { name: tenant.plan },
          select: {
            name: true,
            usersLimit: true,
          },
        });

        console.log('📦 Subscription trouvée:', subscription);

        if (!subscription) {
          throw new BadRequestException(
            "Aucun abonnement valide n'est associé à cette entreprise",
          );
        }

        // 3) Vérifier si le rôle demandé est autorisé par les modules du tenant
        const moduleRoleMap: Record<string, string[]> = {
          Planning: ['PROJECT_MANAGER', 'CONDUCTEUR_DE_TRAVAUX', 'DIRECTEUR'],
          Ressources: ['RESOURCE_MANAGER'],
          Budget: ['BUDGET_MANAGER'],
        };

        const allowedRoles = Array.from(
          new Set(
            (tenant.modules || []).flatMap(
              (module) => moduleRoleMap[module] || [],
            ),
          ),
        );

        console.log('🧩 Modules du tenant:', tenant.modules);
        console.log('✅ Rôles autorisés:', allowedRoles);

        if (!allowedRoles.includes(dto.role)) {
          throw new BadRequestException(
            `Le rôle ${dto.role} n'est pas autorisé pour les modules activés de cette entreprise.`,
          );
        }

        // 4) Compter les utilisateurs existants du tenant
        const usersCount = await tx.user.count({
          where: {
            tenantId: dto.tenantId,
          },
        });

        console.log('👥 Nombre actuel d’utilisateurs:', usersCount);

        // 5) Vérifier la limite du plan
        const isUnlimited =
          subscription.usersLimit.toLowerCase() === 'illimité' ||
          subscription.usersLimit.toLowerCase() === 'unlimited';

        if (!isUnlimited) {
          const maxUsers = Number(subscription.usersLimit);

          if (Number.isNaN(maxUsers)) {
            throw new BadRequestException(
              `Limite utilisateurs invalide pour le plan ${subscription.name}`,
            );
          }

          if (usersCount >= maxUsers) {
            throw new ConflictException(
              `Limite atteinte : le plan ${subscription.name} autorise au maximum ${maxUsers} utilisateurs.`,
            );
          }
        }

        // 6) Créer l’utilisateur
        const user = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            role: dto.role,
            tenantId: dto.tenantId,
            status,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            tenantId: true,
            status: true,
            createdAt: true,
          },
        });

        console.log('✅ Utilisateur créé en base:', user);

        return { user };
      });

      // 7) Envoyer l’email après succès de la transaction
      await this.mailService.sendUserCredentials(
        name,
        email,
        temporaryPassword,
      );

      return {
        message:
          'Utilisateur créé avec succès, identifiants envoyés par email.',
        user: result.user,
      };
    } catch (error: any) {
      console.error('❌ ERREUR CREATE USER:', error);
      console.error('❌ error.message:', error?.message);
      console.error('❌ error.code:', error?.code);
      console.error('❌ error.meta:', error?.meta);

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target =
          (error.meta as any)?.target?.join?.(', ') ?? 'champ unique';

        throw new ConflictException(`Conflit: ${target} déjà utilisé.`);
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Référence invalide : tenantId ou relation associée incorrecte.',
        );
      }

      throw error;
    }
  }

  async findAll(tenantId: number) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        role: { not: 'ADMIN' },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: number) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existing) throw new NotFoundException('Utilisateur introuvable');

    await this.prisma.$transaction(async (tx) => {
      await tx.user.delete({ where: { id } });
    });

    return { message: 'Utilisateur supprimé avec succès' };
  }

  async update(id: number, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Utilisateur introuvable');

    return this.prisma.user.update({
      where: { id },
      data: {
        ...dto,
      },
    });
  }

  async getUserDetails(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: (user as any).status,
        tenantId: user.tenantId,
        createdAt: user.createdAt,
      },
    };
  }

  async findAllUsersForSuperAdmin() {
    const users = await this.usersRepository.findAllWithTenant();
    return users.map((user) => ({
      id: String(user.id),
      name: user.name,
      email: user.email,
      role: user.role,
      status: 'ACTIVE',
      createdAt: user.createdAt,
      tenantId: user.tenantId,
      tenantName: user.tenant?.name ?? 'Plateforme',
    }));
  }
}
