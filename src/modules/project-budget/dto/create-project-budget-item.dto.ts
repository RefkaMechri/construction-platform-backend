import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { PROJECT_BUDGET_ITEM_CATEGORIES } from '../types/project-budget-item-category.type';

export class CreateProjectBudgetItemDto {
  @IsNumber()
  @IsPositive()
  projectId!: number;

  @IsString()
  @IsIn(PROJECT_BUDGET_ITEM_CATEGORIES)
  category!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
