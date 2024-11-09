import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { User } from '../../user/model/user.schema';
import { AuthService } from '../services/auth.service';

// Local strategy: Verifies the user using a username and password
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super();
  }

  // Validates the user's credentials
  async validate(
    username: string,
    password: string,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      // Throw error if user not found
      throw new UnauthorizedException('Invalid credentials');
    }
    // Return the authenticated user
    return user;
  }
}
