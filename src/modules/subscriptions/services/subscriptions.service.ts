import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type SubscriptionPlan } from '@prisma/client';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { SubscriptionsRepository } from '../repositories/subscriptions.repository';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
  ) {}

  private toResponse(subscription: SubscriptionPlan) {
    return {
      id: subscription.id,
      name: subscription.name,
      price: subscription.price,
      period: subscription.period,
      icon: subscription.icon,
      limits: {
        users: subscription.usersLimit,
        projects: subscription.projectsLimit,
      },
      features: subscription.features ?? [],
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }

  async findAll() {
    const subscriptions = await this.subscriptionsRepository.findAll();
    return subscriptions.map((subscription) => this.toResponse(subscription));
  }

  async findOne(id: number) {
    const subscription = await this.subscriptionsRepository.findById(id);

    if (!subscription) {
      throw new NotFoundException('Plan introuvable');
    }

    return this.toResponse(subscription);
  }

  async create(payload: CreateSubscriptionDto) {
    const existing = await this.subscriptionsRepository.findByName(
      payload.name,
    );

    if (existing) {
      throw new ConflictException('Un plan avec ce nom existe déjà');
    }

    const created = await this.subscriptionsRepository.create(payload);
    return this.toResponse(created);
  }

  async update(id: number, payload: UpdateSubscriptionDto) {
    const existing = await this.subscriptionsRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Plan introuvable');
    }

    if (payload.name && payload.name !== existing.name) {
      const duplicate = await this.subscriptionsRepository.findByName(
        payload.name,
      );

      if (duplicate) {
        throw new ConflictException('Un plan avec ce nom existe déjà');
      }
    }

    const updated = await this.subscriptionsRepository.update(id, payload);
    return this.toResponse(updated);
  }

  async remove(id: number) {
    const existing = await this.subscriptionsRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Plan introuvable');
    }

    await this.subscriptionsRepository.delete(id);

    return {
      message: 'Plan supprimé avec succès',
    };
  }
}
