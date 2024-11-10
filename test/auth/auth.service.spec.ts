import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../../src/auth/services/auth.service';
import { UserService } from '../../src/user/services/user.service';

// Mock the external services
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let userService: UserService;
  let jwtService: JwtService;
  // let configService: ConfigService;

  const mockUser = {
    _id: '123',
    username: 'testuser',
    password: 'hashedpassword',
    roles: ['user'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            getUserByUsername: jest.fn().mockResolvedValue(mockUser),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(10),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
    // configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user without password if credentials are valid', async () => {
      // Arrange
      const passwordCompareMock = bcrypt.compare as jest.Mock;
      passwordCompareMock.mockResolvedValue(true);

      // Act
      const result = await authService.validateUser(
        mockUser.username,
        'password123',
      );

      // Assert
      expect(result).toEqual({
        _id: '123',
        username: 'testuser',
        roles: ['user'],
      });
      expect(userService.getUserByUsername).toHaveBeenCalledWith(
        mockUser.username,
      );
      expect(passwordCompareMock).toHaveBeenCalledWith(
        'password123',
        mockUser.password,
      );
    });

    it('should return null if password is invalid', async () => {
      // Arrange
      const passwordCompareMock = bcrypt.compare as jest.Mock;
      passwordCompareMock.mockResolvedValue(false);

      // Act
      const result = await authService.validateUser(
        mockUser.username,
        'wrongpassword',
      );

      // Assert
      expect(result).toBeNull();
      expect(userService.getUserByUsername).toHaveBeenCalledWith(
        mockUser.username,
      );
      expect(passwordCompareMock).toHaveBeenCalledWith(
        'wrongpassword',
        mockUser.password,
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      // Arrange
      // (userService.getUserByUsername as jest.Mock).mockResolvedValue(null);
      // Arrange: Mock getUserByUsername to throw NotFoundException
      (userService.getUserByUsername as jest.Mock).mockRejectedValue(
        new NotFoundException('User not found'),
      );

      // Act / Assert
      await expect(
        authService.validateUser('nonexistentuser', 'password123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('login', () => {
    it('should return a JWT token on successful login', async () => {
      // Act
      const result = await authService.login({ username: 'testuser' });

      // Assert
      expect(result).toEqual({ access_token: 'jwt-token' });
      expect(userService.getUserByUsername).toHaveBeenCalledWith('testuser');
      expect(jwtService.sign).toHaveBeenCalledWith({
        username: 'testuser',
        sub: '123',
        roles: ['user'],
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      // Arrange
      // Arrange: Mock getUserByUsername to throw NotFoundException
      (userService.getUserByUsername as jest.Mock).mockRejectedValue(
        new NotFoundException('User not found'),
      );

      // Act / Assert
      await expect(
        authService.login({
          username: 'nonexistentuser',
          password: 'password',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('hashPassword', () => {
    it('should hash the password correctly', async () => {
      // Arrange
      const hashMock = bcrypt.hash as jest.Mock;
      hashMock.mockResolvedValue('hashedpassword');

      // Act
      const result = await authService.hashPassword('password123');

      // Assert
      expect(result).toBe('hashedpassword');
      expect(hashMock).toHaveBeenCalledWith('password123', 10);
    });
  });

  describe('comparePassword', () => {
    it('should return true if passwords match', async () => {
      // Arrange
      const compareMock = bcrypt.compare as jest.Mock;
      compareMock.mockResolvedValue(true);

      // Act
      const result = await authService.comparePassword(
        'password123',
        'hashedpassword',
      );

      // Assert
      expect(result).toBe(true);
      expect(compareMock).toHaveBeenCalledWith('password123', 'hashedpassword');
    });

    it('should return false if passwords do not match', async () => {
      // Arrange
      const compareMock = bcrypt.compare as jest.Mock;
      compareMock.mockResolvedValue(false);

      // Act
      const result = await authService.comparePassword(
        'password123',
        'wronghashedpassword',
      );

      // Assert
      expect(result).toBe(false);
      expect(compareMock).toHaveBeenCalledWith(
        'password123',
        'wronghashedpassword',
      );
    });
  });
});
