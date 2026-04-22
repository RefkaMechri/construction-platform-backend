import { IsBoolean, IsOptional } from 'class-validator';

export class MarkAsReadDto {
  @IsOptional()
  @IsBoolean()
  isRead?: boolean = true;
}
