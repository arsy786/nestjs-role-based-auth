import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Local Auth Guard: Handles local authentication for user login
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
