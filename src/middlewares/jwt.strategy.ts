/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'super_admin_secret_key_123',
    });
  }

  validate(payload: any) {
    // devient req.user
    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      id: payload.id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      email: payload.email,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      role: payload.role,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      tenantId: payload.tenantId,
    };
  }
}
