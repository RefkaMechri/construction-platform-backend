import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        tenantId: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe invalide');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    // Ajoute ça temporairement
    console.log('password reçu:', JSON.stringify(password));
    console.log('hash en base:', user.password);
    console.log('résultat compare:', isPasswordValid);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe invalide');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      role: user.role,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      tenantId: user.tenantId,
    };

    const access_token = await this.jwtService.signAsync(payload);

    return {
      access_token,
      user: {
        id: user.id,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        name: user.name,
        email: user.email,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        role: user.role,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        tenantId: user.tenantId,
      },
    };
  }
}
