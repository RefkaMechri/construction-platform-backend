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
      console.log('Creating user with data:', dto);

      const email = dto.email.trim().toLowerCase();
      const name = dto.name.trim();
      const temporaryPassword = `${dto.name.trim().replace(/\s+/g, '')}@User123`;
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      const result = await this.prisma.$transaction(async (tx) => {
        // 1) Récupérer le tenant
        const tenant = await tx.tenant.findUnique({
          where: { id: dto.tenantId },
          select: {
            id: true,
            plan: true,
          },
        });

        if (!tenant) {
          throw new NotFoundException('Entreprise introuvable');
        }

        // 2) Récupérer le plan / abonnement
        const subscription = await tx.subscriptionPlan.findUnique({
          where: { name: tenant.plan },
          select: {
            name: true,
            usersLimit: true,
          },
        });

        if (!subscription) {
          throw new BadRequestException(
            "Aucun abonnement valide n'est associé à cette entreprise",
          );
        }

        // 3) Compter les utilisateurs existants du tenant
        const usersCount = await tx.user.count({
          where: {
            tenantId: dto.tenantId,
          },
        });

        // 4) Vérifier la limite
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

        // 5) Créer le user
        const user = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            role: dto.role,
            tenantId: dto.tenantId,
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

        return { user };
      });

      // ✅ Envoi email après la transaction (si transaction échoue, email non envoyé)
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
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target =
          (error.meta as any)?.target?.join?.(', ') ?? 'champ unique';

        throw new ConflictException(`Conflit: ${target} déjà utilisé.`);
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

  async remove(id: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existing) throw new NotFoundException('Utilisateur introuvable');

    await this.prisma.$transaction(async (tx) => {
      await tx.user.delete({ where: { id } });
    });

    return { message: 'Utilisateur supprimé avec succès' };
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Utilisateur introuvable');

    return this.prisma.user.update({
      where: { id },
      data: {
        ...dto,
      },
    });
  }

  async getUserDetails(id: string) {
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
