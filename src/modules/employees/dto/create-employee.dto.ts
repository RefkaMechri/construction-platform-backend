import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
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

  @Type(() => Number)
  @IsInt()
  tenantId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  createdById?: number;
}
