import { IsNumber, IsPositive } from 'class-validator';

export class UpdateMaterialUnitPriceDto {
  @IsNumber()
  @IsPositive()
  unitPrice!: number;
}
