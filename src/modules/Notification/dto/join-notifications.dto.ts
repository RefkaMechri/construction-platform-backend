import { IsInt, Min } from 'class-validator';

export class JoinNotificationsDto {
  @IsInt()
  @Min(1)
  userId!: number;
}
