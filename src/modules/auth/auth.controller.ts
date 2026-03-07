import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../../middlewares/public.decorator';

class LoginDto {
  email: string;
  password: string;
}
@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    console.log('LOGIN BODY:', body);
    return this.authService.login(body.email, body.password);
  }
}
