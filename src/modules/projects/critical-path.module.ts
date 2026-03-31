import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CriticalPathController } from './controllers/critical-path.controller';
import { CriticalPathService } from './services/critical-path.service';

@Module({
  controllers: [CriticalPathController],
  providers: [CriticalPathService, PrismaService],
  exports: [CriticalPathService],
})
export class CriticalPathModule {}
