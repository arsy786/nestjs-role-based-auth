import { HttpStatus, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { AuthController } from '../../src/auth/controllers/auth.controller';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { LocalAuthGuard } from '../../src/auth/guards/local-auth.guard';
import { RolesGuard } from '../../src/auth/guards/roles.guard';
import { AuthService } from '../../src/auth/services/auth.service';
import { Role } from '../../src/common/enums/role.enum';

describe('AuthController', () => {
  let authController: AuthController;
  // let authService: AuthService;
  let res: Response;

  const mockAuthService = {
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .overrideGuard(LocalAuthGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    authController = module.get<AuthController>(AuthController);
    // authService = module.get<AuthService>(AuthService);
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return access token on successful login', async () => {
      const mockLoginResponse = { access_token: 'jwt-token' };
      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      const req = { body: { username: 'testuser', password: 'password' } };

      await authController.login(req, res);

      expect(mockAuthService.login).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockLoginResponse);
    });

    it('should throw NotFoundException if login fails', async () => {
      mockAuthService.login.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      const req = {
        body: { username: 'nonexistentuser', password: 'wrongpassword' },
      };

      await expect(authController.login(req, res)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile if authenticated', async () => {
      const mockUser = { id: '123', username: 'testuser' };
      const req = { user: mockUser };

      await authController.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('onlyAdmin', () => {
    it('should return response for admin user', async () => {
      const mockAdminUser = {
        id: '123',
        username: 'adminuser',
        roles: [Role.Admin],
      };
      const req = { user: mockAdminUser };

      await authController.onlyAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockAdminUser);
    });

    /*
    it('should throw ForbiddenException if user is not admin', async () => {
      // since the RolesGuard is handling the exception before it reaches the controller, the controller method itself will not be invoked if the guard rejects the request.
      // scenario will be handled by e2e tests
    });
    */
  });

  describe('onlyUser', () => {
    it('should return response for regular user', async () => {
      const mockUser = {
        id: '123',
        username: 'regularuser',
        roles: [Role.User],
      };
      const req = { user: mockUser };

      await authController.onlyUser(req, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    /*
    it('should throw ForbiddenException if user is not regular user', async () => {
      // since the RolesGuard is handling the exception before it reaches the controller, the controller method itself will not be invoked if the guard rejects the request.
      // scenario will be handled by e2e tests
    });
    */
  });
});
