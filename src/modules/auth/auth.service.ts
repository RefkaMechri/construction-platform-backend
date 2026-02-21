import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(email: string, password: string) {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@test.com';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || '123456';

    if (email !== superAdminEmail || password !== superAdminPassword) {
      throw new UnauthorizedException('Email ou mot de passe invalide');
    }

    const user = {
      id: 1,
      email: superAdminEmail,
      role: 'SUPER_ADMIN',
      name: 'Super Admin',
    };

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const access_token = await this.jwtService.signAsync(payload);

    return {
      access_token,
      user,
    };
  }
}
