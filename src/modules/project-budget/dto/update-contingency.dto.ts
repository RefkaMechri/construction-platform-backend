import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateContingencyDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  contingencyRate?: number;
}
