import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ModulesController } from './controllers/modules.controller';
import { ModulesRepository } from './repositories/modules.repository';
import { ModulesService } from './services/modules.service';

@Module({
  imports: [PrismaModule],
  controllers: [ModulesController],
  providers: [ModulesService, ModulesRepository],
  exports: [ModulesService],
})
export class ModulesModule {}
