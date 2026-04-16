import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateMaterialAssignmentDto {
  @IsInt()
  materialId!: number;

  @IsInt()
  taskId!: number;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  createdById?: number;
}
