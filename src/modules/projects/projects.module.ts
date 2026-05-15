import { forwardRef, Module } from '@nestjs/common';
import { ProjectsController } from './controllers/projects.controller';
import { ProjectsService } from './services/projects.service';
import { ProjectsRepository } from './repositories/projects.repository';
import { PrismaService } from 'prisma/prisma.service';
import { AiModule } from '../AI/ai.module';
import { SiteManagerProjectsController } from './controllers/site-manager-projects.controller';
import { MaterialAssignmentsModule } from '../Material/material-assignments.module';
import { TasksModule } from './tasks.module';
import { NotificationsModule } from '../Notification/notifications.module';

@Module({
  imports: [
    AiModule,
    MaterialAssignmentsModule,
    forwardRef(() => TasksModule),
    NotificationsModule,
  ],
  controllers: [ProjectsController, SiteManagerProjectsController],
  providers: [ProjectsService, ProjectsRepository, PrismaService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
