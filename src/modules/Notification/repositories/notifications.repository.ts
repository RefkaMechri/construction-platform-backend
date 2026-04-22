import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { UpdateNotificationDto } from '../dto/update-notification.dto';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        severity: data.severity,
        isRead: data.isRead ?? false,
        readAt: data.isRead ? new Date() : null,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
      },
    });
  }

  async findExistingBySource(params: {
    userId: number;
    type: string;
    sourceType: string;
    sourceId: number;
  }) {
    return this.prisma.notification.findFirst({
      where: {
        userId: params.userId,
        type: params.type,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
      },
    });
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.NotificationWhereInput;
    orderBy?: Prisma.NotificationOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params || {};

    return this.prisma.notification.findMany({
      skip,
      take,
      where,
      orderBy: orderBy ?? { createdAt: 'desc' },
    });
  }

  async count(where?: Prisma.NotificationWhereInput) {
    return this.prisma.notification.count({ where });
  }

  async findById(id: number) {
    return this.prisma.notification.findUnique({
      where: { id },
    });
  }

  async findByUserId(
    userId: number,
    options?: { skip?: number; take?: number },
  ) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take,
    });
  }

  async findUnreadByUserId(userId: number) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        isRead: false,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countUnreadByUserId(userId: number) {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async update(id: number, data: UpdateNotificationDto) {
    const updateData: Prisma.NotificationUpdateInput = {
      type: data.type,
      title: data.title,
      message: data.message,
      severity: data.severity as
        | Prisma.EnumNotificationSeverityFieldUpdateOperationsInput
        | undefined,
    };

    if (typeof data.isRead === 'boolean') {
      updateData.isRead = data.isRead;
      updateData.readAt = data.isRead ? new Date() : null;
    }

    return this.prisma.notification.update({
      where: { id },
      data: updateData,
    });
  }

  async markAsRead(id: number) {
    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsReadByUserId(userId: number) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async delete(id: number) {
    return this.prisma.notification.delete({
      where: { id },
    });
  }

  async deleteAllByUserId(userId: number) {
    return this.prisma.notification.deleteMany({
      where: { userId },
    });
  }
}
