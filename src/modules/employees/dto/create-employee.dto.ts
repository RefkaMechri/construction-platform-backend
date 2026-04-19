import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsDateString,
  IsPositive,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EmployeeStatus, AvailabilityStatus } from '../types/employee.types';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  jobTitle!: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  hireDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @IsOptional()
  @IsEnum(AvailabilityStatus)
  availabilityStatus?: AvailabilityStatus;

  @IsOptional()
  @IsDateString()
  unavailableFrom?: string;

  @IsOptional()
  @IsDateString()
  unavailableTo?: string;

  @IsOptional()
  @IsString()
  unavailabilityNote?: string;

  @Type(() => Number)
  @IsInt()
  tenantId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  createdById?: number;

  @IsNumber()
  @IsPositive()
  dailyCost!: number;
}
