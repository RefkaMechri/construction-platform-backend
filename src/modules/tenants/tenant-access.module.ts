import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { TenantAccessController } from './controllers/tenant-access.controller';
import { TenantAccessService } from './services/tenant-access.service';

@Module({
  controllers: [TenantAccessController],
  providers: [TenantAccessService, PrismaService],
  exports: [TenantAccessService],
})
export class TenantAccessModule {}
