import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { NotificationSeverityEnum } from '../types/notification.types';

export class UpdateNotificationDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsEnum(NotificationSeverityEnum)
  severity?: NotificationSeverityEnum;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}
