import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export enum ResourceDashboardPeriod {
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export class ResourceDashboardQueryDto {
  @IsOptional()
  @IsEnum(ResourceDashboardPeriod)
  period?: ResourceDashboardPeriod = ResourceDashboardPeriod.MONTH;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
