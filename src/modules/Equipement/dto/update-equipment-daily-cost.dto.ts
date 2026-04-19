import { IsNumber, IsPositive } from 'class-validator';

export class UpdateEquipmentDailyCostDto {
  @IsNumber()
  @IsPositive()
  dailyCost!: number;
}
