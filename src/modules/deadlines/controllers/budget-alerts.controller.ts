import { Controller, Post } from '@nestjs/common';
import { BudgetAlertsService } from '../services/budget-alerts.service';

@Controller('budget-alerts')
export class BudgetAlertsController {
  constructor(private readonly budgetAlertsService: BudgetAlertsService) {}

  @Post('run')
  runNow() {
    return this.budgetAlertsService.runNow();
  }
}
