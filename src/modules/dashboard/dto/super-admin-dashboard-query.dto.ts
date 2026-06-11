import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export enum SuperAdminDashboardPeriod {
  MONTH = 'month',
  YEAR = 'year',
}

export class SuperAdminDashboardQueryDto {
  @IsOptional()
  @IsEnum(SuperAdminDashboardPeriod)
  period?: SuperAdminDashboardPeriod = SuperAdminDashboardPeriod.YEAR;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
