import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import { AuthService } from '../../src/auth/services/auth.service';
import { UserDocument } from '../../src/user/model/user.schema';
import { UserService } from '../../src/user/services/user.service';

describe('UserService', () => {
  let userService: UserService;
  let userModel: Model<UserDocument>;
  let authService: AuthService;

  const mockUser = {
    _id: new Types.ObjectId().toString(),
    username: 'testuser',
    password: 'hashedpassword',
    roles: ['user'],
  };

  // const mockAuthService = {
  //   hashPassword: jest.fn().mockResolvedValue('hashedpassword'),
  // };

  // const mockUserModel = {
  //   find: jest.fn().mockResolvedValue([mockUser]),
  //   findById: jest.fn().mockResolvedValue(mockUser),
  //   findOne: jest.fn().mockResolvedValue(null),
  //   findByIdAndDelete: jest.fn().mockResolvedValue(null),
  //   exists: jest.fn().mockResolvedValue(true),
  //   save: jest.fn(),
  // };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken('User'),
          useValue: {
            find: jest.fn(),
            findById: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            exists: jest.fn(),
            findByIdAndDelete: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            hashPassword: jest.fn(),
          },
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    userModel = module.get<Model<UserDocument>>(getModelToken('User'));
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clean up mocks between tests
  });

  describe('getAllUsers', () => {
    it('should return a list of users', async () => {
      // given
      (userModel.find as jest.Mock).mockResolvedValue([mockUser]);

      // when
      const users = await userService.getAllUsers();

      // then
      expect(users).toEqual([mockUser]);
      expect(userModel.find).toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should return a user if found', async () => {
      // given
      (userModel.findById as jest.Mock).mockResolvedValue(mockUser);

      // when
      const user = await userService.getUserById(mockUser._id);

      // then
      expect(user).toEqual(mockUser);
      expect(userModel.findById).toHaveBeenCalledWith(mockUser._id);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      // given
      (userModel.findById as jest.Mock).mockResolvedValue(null);

      // when / then
      await expect(userService.getUserById(mockUser._id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for invalid ObjectId', async () => {
      await expect(userService.getUserById('invalidId')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserByUsername', () => {
    it('should return a user if found', async () => {
      // given
      (userModel.findOne as jest.Mock).mockResolvedValue(mockUser);

      // when
      const user = await userService.getUserByUsername(mockUser.username);

      // then
      expect(user).toEqual(mockUser);
      expect(userModel.findOne).toHaveBeenCalledWith({
        username: mockUser.username,
      });
    });

    it('should throw NotFoundException if user is not found', async () => {
      // given
      (userModel.findOne as jest.Mock).mockResolvedValue(null);

      // when / then
      await expect(userService.getUserByUsername('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createUser', () => {
    it('should create a new user if username is unique', async () => {
      // given
      (userModel.findOne as jest.Mock).mockResolvedValue(null);
      (authService.hashPassword as jest.Mock).mockResolvedValue(
        'hashedPassword',
      );
      const newUser = {
        ...mockUser,
        save: jest.fn().mockResolvedValue(mockUser),
      };
      (userModel.create as jest.Mock).mockResolvedValue(newUser);

      // when
      await userService.createUser({
        username: 'newuser',
        password: 'password123',
      });

      // then
      expect(authService.hashPassword).toHaveBeenCalledWith('password123');
      expect(userModel.findOne).toHaveBeenCalledWith({ username: 'newuser' });
      expect(userModel.create).toHaveBeenCalledWith({
        username: 'newuser',
        password: 'hashedPassword',
      });
      expect(newUser.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if username already exists', async () => {
      // given
      (userModel.findOne as jest.Mock).mockResolvedValue(mockUser);

      // when / then
      await expect(
        userService.createUser({
          username: mockUser.username,
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateUserById', () => {
    it('should update a user if they exist', async () => {
      // given
      const userId = '123';
      const userUpdate = {
        username: 'newuser',
        password: 'password123',
        roles: ['userUpdate'],
      };

      const userInDb = {
        _id: userId,
        username: 'olduser',
        password: 'oldpassword',
        roles: ['user'],
        save: jest.fn().mockResolvedValue(true),
      };

      // mock the behavior for finding the user by ID and password hashing
      (userModel.findById as jest.Mock).mockResolvedValue(userInDb);
      (authService.hashPassword as jest.Mock).mockResolvedValue(
        'hashedPassword',
      );

      // when
      await userService.updateUserById(userId, userUpdate);

      // then
      expect(userModel.findById).toHaveBeenCalledWith(userId);
      expect(userModel.findOne).toHaveBeenCalledWith({ username: 'newuser' });
      expect(authService.hashPassword).toHaveBeenCalledWith('password123');
      expect(userInDb.username).toBe('newuser');
      expect(userInDb.password).toBe('hashedPassword');
      expect(userInDb.roles).toEqual(['userUpdate']);
      expect(userInDb.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if new username already exists', async () => {
      // given
      const userId = '123';
      const userUpdate = {
        username: 'newuser',
        password: 'password123',
        roles: ['user'],
      };

      const existingUser = { _id: '456', username: 'newuser', roles: ['user'] };

      (userModel.findById as jest.Mock).mockResolvedValue({
        username: 'olduser',
        password: 'oldpassword',
        roles: ['user'],
      });
      (userModel.findOne as jest.Mock).mockResolvedValue(existingUser);

      // when / then
      await expect(
        userService.updateUserById(userId, userUpdate),
      ).rejects.toThrow(
        new ConflictException(`Username ${userUpdate.username} already exists`),
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      // given
      (userModel.findById as jest.Mock).mockResolvedValue(null);

      // when / then
      await expect(
        userService.updateUserById(mockUser._id, {
          username: 'newuser',
          password: 'password',
          roles: ['admin'],
        }),
      ).rejects.toThrow(
        new NotFoundException(`User with id ${mockUser._id} does not exist`),
      );
    });
  });

  describe('patchUserById', () => {
    it('should throw NotFoundException if the user does not exist', async () => {
      // given
      const userId = '123';
      const partialUserUpdate = {
        username: 'newuser',
        password: 'password123',
      };

      // mock the behavior to return null (user not found)
      (userModel.findById as jest.Mock).mockResolvedValue(null);

      // when / then
      await expect(
        userService.patchUserById(userId, partialUserUpdate),
      ).rejects.toThrow(
        new NotFoundException(`User with id ${userId} does not exist`),
      );
    });

    it('should throw ConflictException if the new username already exists', async () => {
      // given
      const userId = '123';
      const partialUserUpdate = { username: 'newuser' };

      const existingUser = { _id: '456', username: 'newuser' };

      // mock the behavior for finding the user by ID and checking username availability
      (userModel.findById as jest.Mock).mockResolvedValue({
        username: 'olduser',
        password: 'oldpassword',
        roles: ['user'],
      });
      (userModel.findOne as jest.Mock).mockResolvedValue(existingUser);

      // when / then
      await expect(
        userService.patchUserById(userId, partialUserUpdate),
      ).rejects.toThrow(
        new ConflictException(
          `Username ${partialUserUpdate.username} already exists`,
        ),
      );
    });

    it('should update the user partially with provided fields', async () => {
      // given
      const userId = '123';
      const partialUserUpdate = {
        username: 'newuser',
        password: 'password123',
      };

      const userInDb = {
        _id: userId,
        username: 'olduser',
        password: 'oldpassword',
        roles: ['user'],
        save: jest.fn().mockResolvedValue(true),
      };

      // mock the behavior for finding the user by ID and password hashing
      (userModel.findById as jest.Mock).mockResolvedValue(userInDb);
      (authService.hashPassword as jest.Mock).mockResolvedValue(
        'hashedPassword',
      );

      // when
      await userService.patchUserById(userId, partialUserUpdate);

      // then
      expect(userModel.findById).toHaveBeenCalledWith(userId);
      expect(userModel.findOne).toHaveBeenCalledWith({ username: 'newuser' });
      expect(authService.hashPassword).toHaveBeenCalledWith('password123');
      expect(userInDb.username).toBe('newuser');
      expect(userInDb.password).toBe('hashedPassword');
      expect(userInDb.save).toHaveBeenCalled();
    });

    it('should only update the provided fields and not modify others', async () => {
      // given
      const userId = '123';
      const partialUserUpdate = { roles: ['admin'] };

      const userInDb = {
        _id: userId,
        username: 'olduser',
        password: 'oldpassword',
        roles: ['user'],
        save: jest.fn().mockResolvedValue(true),
      };

      // mock the behavior for finding the user by ID
      (userModel.findById as jest.Mock).mockResolvedValue(userInDb);

      // when
      await userService.patchUserById(userId, partialUserUpdate);

      // then
      expect(userInDb.roles).toEqual(['admin']);
      expect(userInDb.username).toBe('olduser');
      expect(userInDb.password).toBe('oldpassword');
      expect(userInDb.save).toHaveBeenCalled();
    });

    it('should not update username if it is the same as the existing one', async () => {
      // given
      const userId = '123';
      const partialUserUpdate = { username: 'olduser' };

      const userInDb = {
        _id: userId,
        username: 'olduser',
        password: 'oldpassword',
        roles: ['user'],
        save: jest.fn().mockResolvedValue(true),
      };

      // mock the behavior for finding the user by ID
      (userModel.findById as jest.Mock).mockResolvedValue(userInDb);

      // when
      await userService.patchUserById(userId, partialUserUpdate);

      // then
      expect(userInDb.username).toBe('olduser'); // No change
      expect(userInDb.save).toHaveBeenCalled();
    });
  });

  describe('deleteUserById', () => {
    it('should delete a user if they exist', async () => {
      // given
      (userModel.exists as jest.Mock).mockResolvedValue(true);
      (userModel.findByIdAndDelete as jest.Mock).mockResolvedValue(mockUser);

      // when
      await userService.deleteUserById(mockUser._id);

      // then
      expect(userModel.exists).toHaveBeenCalledWith({ _id: mockUser._id });
      expect(userModel.findByIdAndDelete).toHaveBeenCalledWith(mockUser._id);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      // given
      (userModel.exists as jest.Mock).mockResolvedValue(false);

      // when / then
      await expect(userService.deleteUserById(mockUser._id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
