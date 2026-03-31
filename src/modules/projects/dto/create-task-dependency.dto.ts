import { IsEnum, IsInt, Min } from 'class-validator';
import { TaskDependencyType } from '@prisma/client';

export class CreateTaskDependencyDto {
  @IsInt()
  @Min(1)
  predecessorTaskId: number;

  @IsInt()
  @Min(1)
  successorTaskId: number;

  @IsEnum(TaskDependencyType)
  type: TaskDependencyType;

  @IsInt()
  lagDays: number;
}
