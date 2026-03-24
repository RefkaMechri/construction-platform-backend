import { Injectable } from '@nestjs/common';
import { Prisma, type SubscriptionPlan } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';

@Injectable()
export class SubscriptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<SubscriptionPlan[]> {
    return this.prisma.subscriptionPlan.findMany({
      orderBy: { price: 'asc' },
    });
  }

  findById(id: number): Promise<SubscriptionPlan | null> {
    return this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });
  }

  findByName(name: string): Promise<SubscriptionPlan | null> {
    return this.prisma.subscriptionPlan.findUnique({
      where: { name },
    });
  }

  create(payload: CreateSubscriptionDto): Promise<SubscriptionPlan> {
    return this.prisma.subscriptionPlan.create({
      data: {
        name: payload.name,
        price: payload.price,
        period: payload.period ?? '/mois',
        icon: payload.icon ?? 'box',
        isPopular: payload.isPopular ?? false,
        usersLimit: payload.usersLimit,
        projectsLimit: payload.projectsLimit,
        storageLimit: payload.storageLimit,
        supportType: payload.supportType,
        features: payload.features,
      },
    });
  }

  update(
    id: number,
    payload: UpdateSubscriptionDto,
  ): Promise<SubscriptionPlan> {
    const data: Prisma.SubscriptionPlanUpdateInput = {
      ...(payload.name !== undefined && { name: payload.name }),
      ...(payload.price !== undefined && { price: payload.price }),
      ...(payload.period !== undefined && { period: payload.period }),
      ...(payload.icon !== undefined && { icon: payload.icon }),
      ...(payload.isPopular !== undefined && { isPopular: payload.isPopular }),
      ...(payload.usersLimit !== undefined && {
        usersLimit: payload.usersLimit,
      }),
      ...(payload.projectsLimit !== undefined && {
        projectsLimit: payload.projectsLimit,
      }),
      ...(payload.storageLimit !== undefined && {
        storageLimit: payload.storageLimit,
      }),
      ...(payload.supportType !== undefined && {
        supportType: payload.supportType,
      }),
      ...(payload.features !== undefined && { features: payload.features }),
    };

    return this.prisma.subscriptionPlan.update({
      where: { id },
      data,
    });
  }

  delete(id: number): Promise<SubscriptionPlan> {
    return this.prisma.subscriptionPlan.delete({
      where: { id },
    });
  }

  resetPopularFlag() {
    return this.prisma.subscriptionPlan.updateMany({
      data: {
        isPopular: false,
      },
    });
  }

  resetPopularFlagExcept(id: number) {
    return this.prisma.subscriptionPlan.updateMany({
      where: {
        NOT: { id },
      },
      data: {
        isPopular: false,
      },
    });
  }
}
