import { Module } from '@nestjs/common';
import { DeadlinesController } from './controllers/deadlines.controller';
import { DeadlinesService } from './services/deadlines.service';
import { PrismaService } from 'prisma/prisma.service';
import { NotificationsModule } from '../Notification/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [DeadlinesController],
  providers: [DeadlinesService, PrismaService],
  exports: [DeadlinesService],
})
export class DeadlinesModule {}
