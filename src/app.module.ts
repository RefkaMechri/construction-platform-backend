import { Module } from '@nestjs/common';
import { UsersModule } from './modules/users/users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { PrismaModule } from 'prisma/prisma.module';
@Module({
  imports: [PrismaModule, UsersModule, AuthModule, TenantsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
