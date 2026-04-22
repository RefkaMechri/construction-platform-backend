import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JoinNotificationsDto } from '../dto/join-notifications.dto';

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @SubscribeMessage('joinNotifications')
  handleJoinNotifications(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    @MessageBody() payload: JoinNotificationsDto,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    @ConnectedSocket() client: Socket,
  ) {
    const room = this.buildUserRoom(payload.userId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    client.join(room);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    this.logger.log(`Client ${client.id} joined room ${room}`);

    return {
      event: 'joinedNotifications',
      data: {
        room,
        userId: payload.userId,
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @SubscribeMessage('leaveNotifications')
  handleLeaveNotifications(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    @MessageBody() payload: JoinNotificationsDto,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    @ConnectedSocket() client: Socket,
  ) {
    const room = this.buildUserRoom(payload.userId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    client.leave(room);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    this.logger.log(`Client ${client.id} left room ${room}`);

    return {
      event: 'leftNotifications',
      data: {
        room,
        userId: payload.userId,
      },
    };
  }

  emitNotificationToUser(userId: number, notification: unknown) {
    const room = this.buildUserRoom(userId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.server.to(room).emit('newNotification', notification);
  }

  emitNotificationReadToUser(userId: number, notificationId: number) {
    const room = this.buildUserRoom(userId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.server.to(room).emit('notificationRead', {
      notificationId,
      userId,
    });
  }

  emitAllNotificationsReadToUser(userId: number) {
    const room = this.buildUserRoom(userId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.server.to(room).emit('allNotificationsRead', {
      userId,
    });
  }

  emitNotificationDeletedToUser(userId: number, notificationId: number) {
    const room = this.buildUserRoom(userId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.server.to(room).emit('notificationDeleted', {
      notificationId,
      userId,
    });
  }

  emitUnreadCount(userId: number, unreadCount: number) {
    const room = this.buildUserRoom(userId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.server.to(room).emit('notificationsUnreadCount', {
      userId,
      unreadCount,
    });
  }

  private buildUserRoom(userId: number) {
    return `user:${userId}`;
  }
}
