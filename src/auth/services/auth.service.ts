import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../../user/model/user.schema';
import { UserService } from '../../user/services/user.service';

// AuthService handles business logic related to authentication
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService, // Use forwardRef
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // Validate user credentials by comparing hashed password
  async validateUser(
    username: string,
    password: string,
  ): Promise<Omit<User, 'password'> | null> {
    this.logger.log(`Validating user: "${username}"`);

    const user = await this.userService.getUserByUsername(username);

    const passwordMatch = await this.comparePassword(password, user.password);
    if (passwordMatch) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      this.logger.log(`User validated: "${username}"`);
      return result;
    }
    this.logger.warn(`Invalid password for user: "${username}"`);
    return null;
  }

  // Login user and return JWT token
  async login(body: any): Promise<{ access_token: string }> {
    // Step 1: Find the user by username (includes user check)
    const userDB = await this.userService.getUserByUsername(body.username);

    const payload = {
      username: userDB.username,
      sub: userDB._id,
      // sub: user._id.toString(), // Use _id as user identifier
      roles: userDB.roles,
    };
    this.logger.log(`Login successful for user: "${body.username}"`);

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  // Hash password using bcrypt
  async hashPassword(password: string): Promise<string> {
    this.logger.log(`Hashing password`);
    const saltOrRounds = Number(
      this.configService.get<number>('BCRYPT_SALT_ROUNDS'),
    );
    return await bcrypt.hash(password, saltOrRounds);
  }

  // Compare plaintext password with hashed password
  async comparePassword(
    password: string,
    storedPasswordHash: string,
  ): Promise<boolean> {
    this.logger.log(`Comparing password`);
    return await bcrypt.compare(password, storedPasswordHash);
  }
}
