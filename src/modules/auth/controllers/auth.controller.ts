import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { Public } from '../../../middlewares/public.decorator';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

class LoginDto {
  email!: string;
  password!: string;
}
@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    console.log('LOGIN BODY:', body);
    return this.authService.login(body.email, body.password);
  }
}
