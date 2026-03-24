/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CreateModuleDto } from '../dto/create-module.dto';
import { UpdateModuleDto } from '../dto/update-module.dto';

@Injectable()
export class ModulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.featureModule.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  findById(id: number) {
    return this.prisma.featureModule.findUnique({
      where: { id },
    });
  }

  findByName(name: string) {
    return this.prisma.featureModule.findUnique({
      where: { name },
    });
  }

  create(payload: CreateModuleDto) {
    return this.prisma.featureModule.create({
      data: {
        name: payload.name,
        description: payload.description,
        icon: payload.icon ?? 'box',
        category: payload.category,
        isBaseModule: payload.isBaseModule ?? false,
        starterEnabled: payload.starterEnabled ?? false,
        professionalEnabled: payload.professionalEnabled ?? false,
        enterpriseEnabled: payload.enterpriseEnabled ?? false,
        features: payload.features,
      },
    });
  }

  update(id: number, payload: UpdateModuleDto) {
    return this.prisma.featureModule.update({
      where: { id },
      data: {
        ...(payload.name !== undefined && { name: payload.name }),
        ...(payload.description !== undefined && {
          description: payload.description,
        }),
        ...(payload.icon !== undefined && { icon: payload.icon }),
        ...(payload.category !== undefined && { category: payload.category }),
        ...(payload.isBaseModule !== undefined && {
          isBaseModule: payload.isBaseModule,
        }),
        ...(payload.starterEnabled !== undefined && {
          starterEnabled: payload.starterEnabled,
        }),
        ...(payload.professionalEnabled !== undefined && {
          professionalEnabled: payload.professionalEnabled,
        }),
        ...(payload.enterpriseEnabled !== undefined && {
          enterpriseEnabled: payload.enterpriseEnabled,
        }),
        ...(payload.features !== undefined && { features: payload.features }),
      },
    });
  }

  delete(id: number) {
    return this.prisma.featureModule.delete({
      where: { id },
    });
  }
}
