export enum NotificationSeverityEnum {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface NotificationSocketPayload {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  severity: NotificationSeverityEnum;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JoinNotificationRoomPayload {
  userId: number;
}
