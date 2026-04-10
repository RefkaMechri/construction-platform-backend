import { Module } from '@nestjs/common';
import { MaterialController } from './controllers/material.controller';
import { MaterialService } from './services/material.service';
import { MaterialRepository } from './repositories/material.repository';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [MaterialController],
  providers: [MaterialService, MaterialRepository, PrismaService],
  exports: [MaterialService],
})
export class MaterialModule {}
