import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsInt()
  @Min(1)
  phaseId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentTaskId?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
