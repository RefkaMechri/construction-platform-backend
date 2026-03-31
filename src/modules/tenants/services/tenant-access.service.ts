import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

type CurrentUser = {
  tenantId: number | null;
};

@Injectable()
export class TenantAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentTenantModules(user: CurrentUser) {
    if (!user.tenantId) {
      throw new BadRequestException("L'utilisateur n'est lié à aucun tenant.");
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true,
        name: true,
        plan: true,
        modules: true,
        status: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant introuvable.');
    }

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      plan: tenant.plan,
      status: tenant.status,
      modules: tenant.modules || [],
    };
  }
}
