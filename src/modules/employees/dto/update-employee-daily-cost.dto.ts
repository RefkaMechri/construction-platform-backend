import { IsNumber, IsPositive } from 'class-validator';

export class UpdateEmployeeDailyCostDto {
  @IsNumber()
  @IsPositive()
  dailyCost!: number;
}
