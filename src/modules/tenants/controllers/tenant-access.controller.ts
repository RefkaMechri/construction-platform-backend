import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { TenantAccessService } from '../services/tenant-access.service';

@Controller('tenant-access')
export class TenantAccessController {
  constructor(private readonly tenantAccessService: TenantAccessService) {}

  @Get('modules')
  getModules(@Req() req: Request) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.tenantAccessService.getCurrentTenantModules(req.user as any);
  }
}
