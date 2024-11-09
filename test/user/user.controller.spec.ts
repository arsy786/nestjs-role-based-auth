import {
  ConflictException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { User } from 'src/user/model/user.schema';
import { UserController } from '../../src/user/controllers/user.controller';
import { UserService } from '../../src/user/services/user.service';

describe('UserController', () => {
  let userController: UserController;
  let userService: UserService;

  // Mocked Express Response object
  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as Response;

  const mockUsers = [
    { id: '1', name: 'John Doe' },
    { id: '2', name: 'Jane Doe' },
  ];

  const mockUser = { id: '1', name: 'John Doe' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            getAllUsers: jest.fn(), // Mock the getAllUsers method
            getUserById: jest.fn(), // Mock the getUserById method
            createUser: jest.fn(), // Mock the createUser method
            updateUserById: jest.fn(), // Mock the updateUserById method
            patchUserById: jest.fn(), // Mock the patchUserById method
            deleteUserById: jest.fn(), // Mock the deleteUserById method
          },
        },
      ],
    }).compile();

    userController = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clean up mocks between tests
  });

  describe('[GET] /api/v1/user', () => {
    it('given users exist when getAllUsers is called then it should return all users with HTTP 200 status', async () => {
      // given
      (userService.getAllUsers as jest.Mock).mockResolvedValue(mockUsers);

      // when
      await userController.getAllUsers(mockResponse);

      // then
      expect(userService.getAllUsers).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(mockUsers);
    });

    it('given no users exist when getAllUsers is called then it should return HTTP 204', async () => {
      // given
      (userService.getAllUsers as jest.Mock).mockResolvedValue([]);

      // when
      await userController.getAllUsers(mockResponse);

      // then
      expect(userService.getAllUsers).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NO_CONTENT);
      expect(mockResponse.json).toHaveBeenCalledWith([]);
    });
  });

  describe('[GET] /api/v1/user/:id', () => {
    it('given a valid user ID when getUserById is called then it should return user data with HTTP 200 status', async () => {
      // given
      const userId = '1';
      (userService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      // when
      await userController.getUserById(userId, mockResponse);

      // then
      expect(userService.getUserById).toHaveBeenCalledWith(userId);
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(mockUser);
    });

    it('given a non-existent user ID when getUserById is called then it should return NOT_FOUND with appropriate message', async () => {
      // given
      const userId = '1';
      (userService.getUserById as jest.Mock).mockResolvedValue(null);

      // when
      await userController.getUserById(userId, mockResponse);

      // then
      expect(userService.getUserById).toHaveBeenCalledWith(userId);
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: `User with id ${userId} is empty.`,
      });
    });
  });

  describe('[POST] /api/v1/user', () => {
    it('given a valid user when createUser is called then it should create the user with HTTP 201 status', async () => {
      // given
      const newUser: Partial<User> = {
        username: 'Alice Smith',
        password: 'password',
      }; // Create a new user object
      (userService.createUser as jest.Mock).mockResolvedValue(undefined); // Mock successful creation

      // when
      await userController.createUser(newUser, mockResponse);

      // then
      expect(userService.createUser).toHaveBeenCalledWith(newUser);
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(mockResponse.json).toHaveBeenCalledWith(); // Check that json() was called with no arguments
    });

    it('given a user with the same name when createUser is called then it should handle errors appropriately', async () => {
      // Given
      const userWithSameName: Partial<User> = {
        username: 'Alice',
        password: 'password123',
      };
      const conflictError = new ConflictException(
        'Username Alice already exists',
      );

      (userService.createUser as jest.Mock).mockRejectedValue(conflictError);

      // When & Then
      await expect(
        userController.createUser(userWithSameName, mockResponse),
      ).rejects.toThrow(ConflictException);

      expect(userService.createUser).toHaveBeenCalledWith(userWithSameName);
    });
  });

  describe('[PUT] /api/v1/user/:id', () => {
    it('givenUser_whenUpdateUserById_thenStatusOk', async () => {
      // given
      const userId = 'validUserId'; // Assuming this is a valid user ID from the mock database
      const updatedUser = {
        username: 'updatedUser',
        password: 'newPassword',
        roles: ['user', 'admin'],
      };

      // Mock the service methods
      (userService.updateUserById as jest.Mock).mockResolvedValue(undefined); // No return value for successful update

      // when
      await userController.updateUserById(userId, updatedUser, mockResponse);

      // then
      expect(userService.updateUserById).toHaveBeenCalledWith(
        userId,
        updatedUser,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK); // Expect status 200 OK
    });

    it('givenUser_whenUpdateUserByIdWithWrongId_thenStatusNotFound', async () => {
      // given
      const wrongId = 'invalidUserId'; // Invalid user ID for the test case
      const updatedUser = {
        username: 'updatedUser',
        password: 'newPassword',
        roles: ['user', 'admin'],
      };

      // Mock the service methods
      const notFoundError = new NotFoundException(
        `User with id ${wrongId} does not exist`,
      );
      (userService.updateUserById as jest.Mock).mockRejectedValue(
        notFoundError,
      ); // Reject the update with an exception

      // When & Then
      await expect(
        userController.updateUserById(wrongId, updatedUser, mockResponse),
      ).rejects.toThrow(notFoundError);

      expect(userService.updateUserById).toHaveBeenCalledWith(
        wrongId,
        updatedUser,
      );
    });

    it('givenUserWithSameUsername_whenUpdateUserById_thenStatusConflict', async () => {
      // given
      const userId = 'validUserId';
      const userWithDuplicateUsername = {
        username: 'duplicateUser',
        password: 'newPassword',
        roles: ['user', 'admin'],
      };

      // Mock findOne to simulate a username conflict
      const conflictError = new ConflictException(
        `Username ${userWithDuplicateUsername.username} already exists`,
      );
      (userService.updateUserById as jest.Mock).mockRejectedValue(
        conflictError,
      ); // Reject the update with an exception

      // When & Then
      await expect(
        userController.updateUserById(
          userId,
          userWithDuplicateUsername,
          mockResponse,
        ),
      ).rejects.toThrow(conflictError);

      expect(userService.updateUserById).toHaveBeenCalledWith(
        userId,
        userWithDuplicateUsername,
      );
    });
  });

  describe('[PATCH] /api/v1/user/:id', () => {
    it('given a partial user when patchUserById is called then it should return status OK', async () => {
      // given
      const partialUser = { username: 'updatedUser1' };
      const userId = 'validUserId';

      (userService.patchUserById as jest.Mock).mockResolvedValue(undefined);

      // when
      await userController.patchUserById(userId, partialUser, mockResponse);

      // then
      expect(userService.patchUserById).toHaveBeenCalledWith(
        userId,
        partialUser,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('given a non-existent user when patchUserById is called then it should throw NotFoundException', async () => {
      // given
      const nonExistentUserId = '60d5f9f5319a5c1d4c8e7b60';
      const partialUser = { username: 'updatedUser1' };

      const notFoundError = new NotFoundException(
        `User with id ${nonExistentUserId} does not exist`,
      );
      (userService.patchUserById as jest.Mock).mockRejectedValue(notFoundError);

      // when & then
      await expect(
        userController.patchUserById(
          nonExistentUserId,
          partialUser,
          mockResponse,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(userService.patchUserById).toHaveBeenCalledWith(
        nonExistentUserId,
        partialUser,
      );
    });

    it('given a partial user with existing username when patchUserById is called then it should throw ConflictException', async () => {
      // given
      const userId = 'existingUserId';
      const partialUser = { username: 'existingUsername' };
      const conflictError = new ConflictException(
        `Username ${partialUser.username} already exists`,
      );

      (userService.patchUserById as jest.Mock).mockRejectedValue(conflictError);

      // when & then
      await expect(
        userController.patchUserById(userId, partialUser, mockResponse),
      ).rejects.toThrow(ConflictException);

      expect(userService.patchUserById).toHaveBeenCalledWith(
        userId,
        partialUser,
      );
    });

    it('given a partial user with roles when patchUserById is called then it should return status OK and update roles', async () => {
      // given
      const userId = 'validUserId';
      const partialUser = { roles: ['user', 'admin'] };

      (userService.patchUserById as jest.Mock).mockResolvedValue(undefined);

      // when
      await userController.patchUserById(userId, partialUser, mockResponse);

      // then
      expect(userService.patchUserById).toHaveBeenCalledWith(
        userId,
        partialUser,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('[DELETE] /api/v1/user/:id', () => {
    it('given an existing user when deleteUserById is called then it should return status NO_CONTENT', async () => {
      // given
      const userId = 'validUserId';

      (userService.deleteUserById as jest.Mock).mockResolvedValue(undefined);

      // when
      await expect(
        userController.deleteUserById(userId),
      ).resolves.toBeUndefined();

      // then
      expect(userService.deleteUserById).toHaveBeenCalledWith(userId);
    });

    it('given a non-existent user when deleteUserById is called then it should throw NotFoundException', async () => {
      // given
      const nonExistentUserId = 'nonExistentUserId';
      const notFoundError = new NotFoundException(
        `User with id ${nonExistentUserId} does not exist`,
      );

      (userService.deleteUserById as jest.Mock).mockRejectedValue(
        notFoundError,
      );

      // when & then
      await expect(
        userController.deleteUserById(nonExistentUserId),
      ).rejects.toThrow(NotFoundException);

      expect(userService.deleteUserById).toHaveBeenCalledWith(
        nonExistentUserId,
      );
    });
  });
});
