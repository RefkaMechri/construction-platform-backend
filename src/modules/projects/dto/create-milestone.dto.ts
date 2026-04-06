import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MilestoneStatus } from '@prisma/client';

export class CreateMilestoneDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  dueDate!: string;

  @IsInt()
  @Type(() => Number)
  projectId!: number;

  @IsOptional()
  status?: MilestoneStatus;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  taskIds?: number[];
}
