import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { UpdateCompanyDto } from '../dto/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  async getCompany(tenantId: number) {
    if (!tenantId) {
      throw new BadRequestException('Tenant introuvable dans le token');
    }

    const company = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        country: true,
        address: true,
        slug: true,
        plan: true,
        status: true,
        modules: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Entreprise introuvable');
    }

    return company;
  }

  async updateCompany(tenantId: number, dto: UpdateCompanyDto) {
    if (!tenantId) {
      throw new BadRequestException('Tenant introuvable dans le token');
    }

    const existing = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Entreprise introuvable');
    }

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        country: dto.country,
        address: dto.address,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        country: true,
        address: true,
        slug: true,
        plan: true,
        status: true,
        modules: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
