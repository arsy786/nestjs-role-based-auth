import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// JWT Guard: Protects routes by verifying the JWT token
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
