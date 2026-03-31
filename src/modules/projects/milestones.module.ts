import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { MilestonesController } from './controllers/milestones.controller';
import { MilestonesRepository } from './repositories/milestones.repository';
import { MilestonesService } from './services/milestones.service';

@Module({
  controllers: [MilestonesController],
  providers: [MilestonesService, MilestonesRepository, PrismaService],
})
export class MilestonesModule {}
