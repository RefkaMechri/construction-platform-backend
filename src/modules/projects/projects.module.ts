import { Module } from '@nestjs/common';
import { ProjectsController } from './controllers/projects.controller';
import { ProjectsService } from './services/projects.service';
import { ProjectsRepository } from './repositories/projects.repository';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsRepository, PrismaService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
