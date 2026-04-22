import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { NotificationSeverityEnum } from '../types/notification.types';

export class CreateNotificationDto {
  @IsInt()
  @Min(1)
  userId!: number;

  @IsString()
  type!: string;

  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsEnum(NotificationSeverityEnum)
  severity?: NotificationSeverityEnum;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsString()
  sourceType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sourceId?: number;
}
