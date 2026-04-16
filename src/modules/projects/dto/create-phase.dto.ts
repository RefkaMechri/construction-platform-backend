import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PhaseStatus } from '@prisma/client';

export class CreatePhaseDto {
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
  @IsEnum(PhaseStatus)
  status?: PhaseStatus;

  @IsInt()
  @Min(1)
  projectId!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
