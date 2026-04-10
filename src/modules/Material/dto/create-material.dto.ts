import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  AvailabilityStatus,
  MaterialQuality,
  MaterialStatus,
} from '../types/material.type';

export class CreateMaterialDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  category!: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsString()
  unit!: string;

  @IsOptional()
  @IsEnum(MaterialQuality)
  quality?: MaterialQuality;

  @IsOptional()
  @IsEnum(MaterialStatus)
  status?: MaterialStatus;

  @IsOptional()
  @IsEnum(AvailabilityStatus)
  availabilityStatus?: AvailabilityStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsInt()
  tenantId!: number;

  @IsOptional()
  @IsInt()
  createdById?: number;
}
