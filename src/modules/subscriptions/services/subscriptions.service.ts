import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { SubscriptionsRepository } from '../repositories/subscriptions.repository';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
  ) {}

  private toResponse(subscription: any) {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      id: subscription.id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      name: subscription.name,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      price: subscription.price,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      period: subscription.period,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      icon: subscription.icon,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      isPopular: subscription.isPopular,
      limits: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        users: subscription.usersLimit,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        projects: subscription.projectsLimit,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        storage: subscription.storageLimit,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        support: subscription.supportType,
      },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      features: subscription.features ?? [],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      createdAt: subscription.createdAt,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      updatedAt: subscription.updatedAt,
    };
  }

  async findAll() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const subscriptions = await this.subscriptionsRepository.findAll();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return subscriptions.map((subscription) => this.toResponse(subscription));
  }

  async findOne(id: number) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const subscription = await this.subscriptionsRepository.findById(id);

    if (!subscription) {
      throw new NotFoundException('Abonnement introuvable');
    }

    return this.toResponse(subscription);
  }

  async create(payload: CreateSubscriptionDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const existing = await this.subscriptionsRepository.findByName(
      payload.name,
    );

    if (existing) {
      throw new ConflictException('Un abonnement avec ce nom existe déjà');
    }

    if (payload.isPopular) {
      await this.subscriptionsRepository.resetPopularFlag();
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const created = await this.subscriptionsRepository.create(payload);
    return this.toResponse(created);
  }

  async update(id: number, payload: UpdateSubscriptionDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const existing = await this.subscriptionsRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Abonnement introuvable');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (payload.name && payload.name !== existing.name) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const duplicate = await this.subscriptionsRepository.findByName(
        payload.name,
      );

      if (duplicate) {
        throw new ConflictException('Un abonnement avec ce nom existe déjà');
      }
    }

    if (payload.isPopular === true) {
      await this.subscriptionsRepository.resetPopularFlagExcept(id);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const updated = await this.subscriptionsRepository.update(id, payload);
    return this.toResponse(updated);
  }

  async remove(id: number) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const existing = await this.subscriptionsRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Abonnement introuvable');
    }

    await this.subscriptionsRepository.delete(id);

    return {
      message: 'Abonnement supprimé avec succès',
    };
  }
}
