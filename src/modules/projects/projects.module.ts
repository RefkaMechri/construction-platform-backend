import { Module } from '@nestjs/common';
import { ProjectsController } from './controllers/projects.controller';
import { ProjectsService } from './services/projects.service';
import { ProjectsRepository } from './repositories/projects.repository';
import { PrismaService } from 'prisma/prisma.service';
import { AiModule } from '../AI/ai.module';

@Module({
  imports: [AiModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsRepository, PrismaService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
