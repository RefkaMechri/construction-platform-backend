import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TaskAnomalySeverity } from '../types/anomalie.types';

export class CreateAnomalieDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskAnomalySeverity)
  severity?: TaskAnomalySeverity;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];

  @IsInt()
  @Min(1)
  taskId!: number;
}
