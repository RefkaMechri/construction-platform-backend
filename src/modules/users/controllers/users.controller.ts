import {
  Body,
  Controller,
  Get,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  BadRequestException,
} from '@nestjs/common';

import { UsersService } from '../services/users.services';
import * as createUserDto from '../dto/create-user.dto';
import * as updateUserDto from '../dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('all')
  findAllUsersForSuperAdmin() {
    return this.usersService.findAllUsersForSuperAdmin();
  }

  @Get('site-managers/:tenantId')
  getSiteManagers(@Param('tenantId', ParseIntPipe) tenantId: number) {
    if (!tenantId) {
      throw new BadRequestException('tenantId est obligatoire.');
    }

    return this.usersService.findSiteManagersByTenant(tenantId);
  }

  @Get('by-tenant/:tenantId')
  findAll(@Param('tenantId', ParseIntPipe) tenantId: number) {
    return this.usersService.findAll(tenantId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: updateUserDto.UpdateUserDto,
  ) {
    return this.usersService.update(id, body);
  }

  @Get(':id')
  getDetails(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUserDetails(id);
  }

  @Post()
  create(@Body() body: createUserDto.CreateUserDto) {
    return this.usersService.create(body);
  }
}
