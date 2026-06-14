import { Controller, Post } from '@nestjs/common';
import { UsageAlertsService } from '../services/usage-alerts.service';

@Controller('usage-alerts')
export class UsageAlertsController {
  constructor(private readonly usageAlertsService: UsageAlertsService) {}

  @Post('run')
  runNow() {
    return this.usageAlertsService.runNow();
  }
}
