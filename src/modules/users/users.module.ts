import { Module } from '@nestjs/common';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.services';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
