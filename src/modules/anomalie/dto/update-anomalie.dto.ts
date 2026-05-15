import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import {
  TaskAnomalySeverity,
  TaskAnomalyStatus,
} from '../types/anomalie.types';

export class UpdateAnomalieDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskAnomalySeverity)
  severity?: TaskAnomalySeverity;

  @IsOptional()
  @IsEnum(TaskAnomalyStatus)
  status?: TaskAnomalyStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];
}
