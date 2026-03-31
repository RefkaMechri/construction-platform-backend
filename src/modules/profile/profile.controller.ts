import {
  Body,
  Controller,
  Get,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../middlewares/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@Request() req: { user: { id: number } }) {
    return this.profileService.getProfile(req.user.id);
  }

  @Patch()
  updateProfile(
    @Request() req: { user: { id: number } },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(req.user.id, dto);
  }

  @Patch('password')
  changePassword(
    @Request() req: { user: { id: number } },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.profileService.changePassword(req.user.id, dto);
  }
}
