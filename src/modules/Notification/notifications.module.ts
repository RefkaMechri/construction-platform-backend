import { Module } from '@nestjs/common';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationsService } from './services/notifications.service';
import { NotificationsRepository } from './repositories/notifications.repository';
import { NotificationsGateway } from './gateways/notifications.gateway';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [NotificationsController],
  providers: [
    PrismaService,
    NotificationsService,
    NotificationsRepository,
    NotificationsGateway,
  ],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
