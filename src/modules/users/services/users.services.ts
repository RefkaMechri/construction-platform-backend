/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  ConflictException,
  Injectable,
  NotFoundException,
  // NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
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
        // ) Create  user
        const user = await tx.user.create({
          data: {
            name: name,
            email: email,
            password: hashedPassword,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            role: dto.role, //  si tu as TENANT_ADMIN sinon ADMIN
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

      return {
        message: 'user créés avec succès',
        user: result.user,
        credentials: {
          email: email,
          temporaryPassword,
        },
      };
    } catch (error: any) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        //  message plus précis
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
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
    const user = (await this.prisma.user.findUnique({
      where: { id },
    })) as any;

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        tenantId: user.tenantId,
        createdAt: user.createdAt,
      },
    };
  }
}
