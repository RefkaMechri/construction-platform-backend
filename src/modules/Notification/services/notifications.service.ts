import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsRepository } from '../repositories/notifications.repository';
import { NotificationsGateway } from '../gateways/notifications.gateway';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { UpdateNotificationDto } from '../dto/update-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async create(createNotificationDto: CreateNotificationDto) {
    const notification = await this.notificationsRepository.create(
      createNotificationDto,
    );
    const unreadCount = await this.notificationsRepository.countUnreadByUserId(
      createNotificationDto.userId,
    );

    this.notificationsGateway.emitNotificationToUser(
      createNotificationDto.userId,
      notification,
    );

    this.notificationsGateway.emitUnreadCount(
      createNotificationDto.userId,
      unreadCount,
    );

    return notification;
  }

  async findAll(page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const skip = (safePage - 1) * safeLimit;

    const [data, total] = await Promise.all([
      this.notificationsRepository.findAll({
        skip,
        take: safeLimit,
      }),
      this.notificationsRepository.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOne(id: number) {
    const notification = await this.notificationsRepository.findById(id);

    if (!notification) {
      throw new NotFoundException(`Notification avec l'id ${id} introuvable`);
    }

    return notification;
  }

  async findByUserId(userId: number, page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const skip = (safePage - 1) * safeLimit;

    const [data, total, unreadCount] = await Promise.all([
      this.notificationsRepository.findByUserId(userId, {
        skip,
        take: safeLimit,
      }),
      this.notificationsRepository.count({ userId }),
      this.notificationsRepository.countUnreadByUserId(userId),
    ]);

    return {
      data,
      meta: {
        total,
        unreadCount,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findUnreadByUserId(userId: number) {
    const [data, unreadCount] = await Promise.all([
      this.notificationsRepository.findUnreadByUserId(userId),
      this.notificationsRepository.countUnreadByUserId(userId),
    ]);

    return {
      data,
      unreadCount,
    };
  }

  async update(id: number, updateNotificationDto: UpdateNotificationDto) {
    const existing = await this.findOne(id);

    const updated = await this.notificationsRepository.update(
      id,
      updateNotificationDto,
    );
    const unreadCount = await this.notificationsRepository.countUnreadByUserId(
      existing.userId,
    );

    if (
      typeof updateNotificationDto.isRead === 'boolean' &&
      updateNotificationDto.isRead
    ) {
      this.notificationsGateway.emitNotificationReadToUser(existing.userId, id);
    }

    this.notificationsGateway.emitUnreadCount(existing.userId, unreadCount);

    return updated;
  }

  async markAsRead(id: number) {
    const existing = await this.findOne(id);

    if (existing.isRead) {
      return existing;
    }

    const updated = await this.notificationsRepository.markAsRead(id);
    const unreadCount = await this.notificationsRepository.countUnreadByUserId(
      existing.userId,
    );

    this.notificationsGateway.emitNotificationReadToUser(existing.userId, id);
    this.notificationsGateway.emitUnreadCount(existing.userId, unreadCount);

    return updated;
  }

  async markAllAsReadByUserId(userId: number) {
    await this.notificationsRepository.markAllAsReadByUserId(userId);
    const unreadCount =
      await this.notificationsRepository.countUnreadByUserId(userId);

    this.notificationsGateway.emitAllNotificationsReadToUser(userId);
    this.notificationsGateway.emitUnreadCount(userId, unreadCount);

    return {
      message: 'Toutes les notifications ont été marquées comme lues',
      unreadCount,
    };
  }

  async remove(id: number) {
    const existing = await this.findOne(id);

    const deleted = await this.notificationsRepository.delete(id);
    const unreadCount = await this.notificationsRepository.countUnreadByUserId(
      existing.userId,
    );

    this.notificationsGateway.emitNotificationDeletedToUser(
      existing.userId,
      id,
    );
    this.notificationsGateway.emitUnreadCount(existing.userId, unreadCount);

    return deleted;
  }

  async removeAllByUserId(userId: number) {
    const result = await this.notificationsRepository.deleteAllByUserId(userId);

    this.notificationsGateway.emitUnreadCount(userId, 0);

    return {
      message: 'Toutes les notifications de cet utilisateur ont été supprimées',
      deletedCount: result.count,
    };
  }

  async getUnreadCount(userId: number) {
    const unreadCount =
      await this.notificationsRepository.countUnreadByUserId(userId);

    return {
      userId,
      unreadCount,
    };
  }
  async createIfNotExists(createNotificationDto: CreateNotificationDto) {
    if (
      createNotificationDto.sourceType &&
      createNotificationDto.sourceId &&
      createNotificationDto.type
    ) {
      const existing = await this.notificationsRepository.findExistingBySource({
        userId: createNotificationDto.userId,
        type: createNotificationDto.type,
        sourceType: createNotificationDto.sourceType,
        sourceId: createNotificationDto.sourceId,
      });

      if (existing) {
        return existing;
      }
    }

    return this.create(createNotificationDto);
  }
}
