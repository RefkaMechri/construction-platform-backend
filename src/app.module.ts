import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { UsersModule } from './modules/users/users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { PrismaModule } from 'prisma/prisma.module';
import { CompanyModule } from './modules/tenants/company.module';
import { JwtAuthGuard } from './middlewares/jwt-auth.guard';
import { ProfileModule } from './modules/profile/profile.module';
import { RolesModule } from './modules/users/roles.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { ModulesModule } from './modules/subscriptions/modules.module';
import { MailModule } from './shared/mail/mail.module';
import { ConfigModule } from '@nestjs/config';
import { ProjectsModule } from './modules/projects/projects.module';
import { PhasesModule } from './modules/projects/phases.module';
import { TasksModule } from './modules/projects/tasks.module';
import { MilestonesModule } from './modules/projects/milestones.module';
import { TaskDependenciesModule } from './modules/projects/task-dependencies.module';
import { CriticalPathModule } from './modules/projects/critical-path.module';
import { TenantAccessModule } from './modules/tenants/tenant-access.module';
import { GlobalTasksModule } from './modules/projects/global-tasks.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EmployeesModule } from './modules/employees/employees.module';
import { EquipmentModule } from './modules/Equipement/equipment.module';
import { MaterialModule } from './modules/Material/material.module';
import { EmployeeAssignmentsModule } from './modules/employees/employee-assignments.module';
import { EquipmentAssignmentsModule } from './modules/Equipement/equipment-assignments.module';
@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    MailModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    TenantsModule,
    ProfileModule,
    CompanyModule,
    RolesModule,
    SubscriptionsModule,
    ModulesModule,
    ProjectsModule,
    PhasesModule,
    TasksModule,
    MilestonesModule,
    TaskDependenciesModule,
    CriticalPathModule,
    TenantAccessModule,
    GlobalTasksModule,
    EmployeesModule,
    EquipmentModule,
    MaterialModule,
    EmployeeAssignmentsModule,
    EquipmentAssignmentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard }, // Guard global
  ],
})
export class AppModule {}
