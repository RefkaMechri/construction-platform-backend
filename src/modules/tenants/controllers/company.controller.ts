import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../middlewares/jwt-auth.guard';
import { CompanyService } from '../services/company.service';
import { UpdateCompanyDto } from '../dto/update-company.dto';

@Controller('admin/company')
@UseGuards(JwtAuthGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  getCompany(@Req() req: Request & { user: { tenantId: number } }) {
    return this.companyService.getCompany(req.user.tenantId);
  }

  @Patch()
  updateCompany(
    @Req() req: Request & { user: { tenantId: number } },
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companyService.updateCompany(req.user.tenantId, dto);
  }
}
