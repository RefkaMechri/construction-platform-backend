import { IsOptional, IsEnum, IsDateString } from 'class-validator';

export enum DashboardPeriod {
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export class DashboardQueryDto {
  @IsOptional()
  @IsEnum(DashboardPeriod)
  period?: DashboardPeriod = DashboardPeriod.MONTH;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
