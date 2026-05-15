import { IsNumber, Min } from 'class-validator';

export class UpdateMaterialUsageDto {
  @IsNumber()
  @Min(0)
  usedQuantity!: number;
}
