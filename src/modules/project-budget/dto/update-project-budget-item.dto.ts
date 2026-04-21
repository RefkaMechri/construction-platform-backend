import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectBudgetItemDto } from './create-project-budget-item.dto';

export class UpdateProjectBudgetItemDto extends PartialType(
  CreateProjectBudgetItemDto,
) {}
