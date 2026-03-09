import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { UsersModule } from './modules/users/users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { PrismaModule } from 'prisma/prisma.module';

import { JwtAuthGuard } from './middlewares/jwt-auth.guard'; // 👈 ajuste le chemin si besoin
import { ProfileModule } from './modules/profile/profile.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    TenantsModule,
    ProfileModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard }, // ✅ Guard global
  ],
})
export class AppModule {}
