import {
  Body,
  Controller,
  Get,
  Delete,
  Param,
  ParseIntPipe,
  //ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { UsersService } from '../services/users.services';
import * as createUserDto from '../dto/create-user.dto';
import * as updateUserDto from '../dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  //  LIST
  @Get('by-tenant/:tenantId')
  findAll(@Param('tenantId', ParseIntPipe) tenantId: number) {
    return this.usersService.findAll(tenantId);
  }
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: updateUserDto.UpdateUserDto) {
    return this.usersService.update(id, body);
  }
  @Get(':id')
  getDetails(@Param('id') id: string) {
    return this.usersService.getUserDetails(id);
  }

  /*@Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

*/

  @Post()
  create(@Body() body: createUserDto.CreateUserDto) {
    return this.usersService.create(body);
  }
}
