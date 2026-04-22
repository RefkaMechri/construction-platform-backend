import { Controller, Post } from '@nestjs/common';
import { DeadlinesService } from '../services/deadlines.service';

@Controller('deadlines')
export class DeadlinesController {
  constructor(private readonly deadlinesService: DeadlinesService) {}

  @Post('run')
  runNow() {
    return this.deadlinesService.runNow();
  }
}
