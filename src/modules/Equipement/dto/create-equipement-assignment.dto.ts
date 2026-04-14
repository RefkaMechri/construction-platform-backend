import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateEquipementAssignmentDto {
  @IsInt()
  equipmentId!: number;

  @IsInt()
  taskId!: number;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  createdById?: number;
}
