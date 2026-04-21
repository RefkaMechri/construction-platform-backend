import { IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';
import { PROJECT_BUDGET_ITEM_CATEGORIES } from '../types/project-budget-item-category.type';

export class FindProjectBudgetItemsDto {
  @IsOptional()
  @IsNumberString()
  projectBudgetId?: string;

  @IsOptional()
  @IsString()
  @IsIn(PROJECT_BUDGET_ITEM_CATEGORIES)
  category?: string;
}
