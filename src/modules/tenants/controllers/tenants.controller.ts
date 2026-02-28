import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { TenantsService } from '../services/tenants.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';

@Controller('admin/tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  //  LIST
  @Get()
  findAll() {
    return this.tenantsService.findAll();
  }

  //  DETAILS tenant seul (si tu veux garder)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.findOne(id);
  }

  //  DETAILS tenant + admin (pour ta page détails)
  @Get(':id/details')
  getDetails(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.getTenantDetails(id);
  }

  //  CREATE tenant + création auto admin + retourne credentials (comme tu fais)
  @Post()
  create(@Body() body: CreateTenantDto) {
    return this.tenantsService.create(body);
  }

  //  UPDATE tenant
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateTenantDto) {
    return this.tenantsService.update(id, body);
  }

  //  DELETE tenant + users
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.remove(id);
  }

  //  RESET PASSWORD admin (affiche mot de passe temporaire une seule fois)
  @Post(':id/admin/reset-password')
  resetAdminPassword(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.resetAdminPassword(id);
  }
}
