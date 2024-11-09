import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// JWT Strategy: Responsible for validating the JWT and extracting the payload
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secret',
    });
  }

  // called after the user is successfully authenticated
  // Extracts user info from the token payload
  async validate(payload: any) {
    // No need to check if payload is null; passport-jwt handles this for you.
    return {
      userId: payload.sub,
      username: payload.username,
      roles: payload.roles,
    };
  }
}
