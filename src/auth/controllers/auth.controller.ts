import {
  Controller,
  Get,
  HttpStatus,
  Logger,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { Role } from '../../common/enums/role.enum';
import { HasRoles } from '../decorators/has-roles.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { AuthService } from '../services/auth.service';

@Controller('/api/v1/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  // User login with local authentication strategy
  @UseGuards(LocalAuthGuard)
  @Post('/login')
  async login(@Request() req, @Res() res: Response): Promise<Response> {
    this.logger.log(`Login attempt for username: "${req.body.username}"`);
    const accessToken = await this.authService.login(req.body);

    return res.status(HttpStatus.OK).json(accessToken);
  }

  // Retrieves the profile of the authenticated user using JWT
  @UseGuards(JwtAuthGuard)
  @Get('/profile')
  async getProfile(@Request() req, @Res() res: Response): Promise<Response> {
    this.logger.log(`Fetching profile for user ID: "${req.user.id}"`);

    return res.status(HttpStatus.OK).json(req.user);
  }

  // Only admin users can access this route
  @HasRoles(Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('/admin')
  async onlyAdmin(@Request() req, @Res() res: Response): Promise<Response> {
    this.logger.log(`Admin access by user ID: "${req.user.id}"`);

    return res.status(HttpStatus.OK).json(req.user);
  }

  // Only regular users (with Role.User) can access this route
  @HasRoles(Role.User)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('/user')
  async onlyUser(@Request() req, @Res() res: Response): Promise<Response> {
    this.logger.log(`User access by user ID: "${req.user.id}"`);
    return res.status(HttpStatus.OK).json(req.user);
  }
}
