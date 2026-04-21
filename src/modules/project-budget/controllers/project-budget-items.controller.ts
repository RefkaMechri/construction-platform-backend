import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ProjectBudgetItemsService } from '../services/project-budget-items.service';
import { CreateProjectBudgetItemDto } from '../dto/create-project-budget-item.dto';
import { UpdateProjectBudgetItemDto } from '../dto/update-project-budget-item.dto';
import { FindProjectBudgetItemsDto } from '../dto/find-project-budget-items.dto';

@Controller('project-budget-items')
export class ProjectBudgetItemsController {
  constructor(
    private readonly projectBudgetItemsService: ProjectBudgetItemsService,
  ) {}

  @Post()
  create(@Body() dto: CreateProjectBudgetItemDto) {
    return this.projectBudgetItemsService.create(dto);
  }

  @Get()
  findAll(@Query() query: FindProjectBudgetItemsDto) {
    return this.projectBudgetItemsService.findAll({
      projectBudgetId: query.projectBudgetId
        ? Number(query.projectBudgetId)
        : undefined,
      category: query.category,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectBudgetItemsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectBudgetItemDto,
  ) {
    return this.projectBudgetItemsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.projectBudgetItemsService.remove(id);
  }
}
