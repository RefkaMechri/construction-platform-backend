import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsDateString,
  Min,
} from 'class-validator';
import {
  EquipmentAvailabilityStatus,
  EquipmentCondition,
  EquipmentOwnershipType,
  EquipmentStatus,
} from '../types/equipment.type';

export class CreateEquipmentDto {
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
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsInt()
  yearOfManufacture?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  capacity?: string;

  @IsOptional()
  @IsEnum(EquipmentStatus)
  status?: EquipmentStatus;

  @IsOptional()
  @IsEnum(EquipmentAvailabilityStatus)
  availabilityStatus?: EquipmentAvailabilityStatus;

  @IsOptional()
  @IsEnum(EquipmentCondition)
  condition?: EquipmentCondition;

  @IsOptional()
  @IsEnum(EquipmentOwnershipType)
  ownershipType?: EquipmentOwnershipType;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsInt()
  tenantId!: number;

  @IsOptional()
  @IsInt()
  createdById?: number;
}
