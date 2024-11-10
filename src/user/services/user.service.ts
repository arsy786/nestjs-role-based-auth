import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthService } from '../../auth/services/auth.service';
import { User, UserDocument } from '../model/user.schema';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(forwardRef(() => AuthService)) private authService: AuthService,
  ) {}

  async getAllUsers(): Promise<User[]> {
    this.logger.log('From DB, Getting Users');
    return await this.userModel.find();
  }

  async getUserById(id: string): Promise<User | null> {
    // Check if the provided id is a valid ObjectId
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`User with id ${id} does not exist`);
    }

    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException(`User with id ${id} does not exist`);
    }

    this.logger.log(`From DB, Got User with id: ${id}`);
    return user;
  }

  async getUserByUsername(username: string): Promise<UserDocument | null> {
    const user = await this.userModel.findOne({ username });
    if (!user) {
      this.logger.warn(`User not found: "${username}"`);
      throw new NotFoundException(`User with name ${username} does not exist`);
    }
    return user;
  }

  async createUser(user: Partial<User>): Promise<void> {
    const { username, password } = user;

    const existingUser = await this.userModel.findOne({ username });

    // Check if the username already exists
    if (existingUser) {
      throw new ConflictException(`Username ${username} already exists`);
    }

    // Hash the password
    const hashedPassword = await this.authService.hashPassword(password);
    const newUser = await this.userModel.create({
      username,
      password: hashedPassword,
      // roles: ['user'], // Not needed since default is set in schema
    });

    // Save the user
    await newUser.save();
    this.logger.log(
      `In DB, Created new Team with generated id: ${newUser._id}`,
    );
  }

  // Admin full update
  async updateUserById(id: string, user: User): Promise<void> {
    const userDb = await this.userModel.findById(id);

    if (!userDb) {
      throw new NotFoundException(`User with id ${id} does not exist`);
    }

    // Replace all fields for the user, assuming a full update
    // Check if the username is being updated
    if (user.username && user.username !== userDb.username) {
      // Query the database to check if the new username is taken
      const existingUser = await this.userModel.findOne({
        username: user.username,
      });

      if (existingUser) {
        throw new ConflictException(`Username ${user.username} already exists`);
      }
      userDb.username = user.username;
    }
    if (user.password) {
      userDb.password = await this.authService.hashPassword(user.password);
    }
    // userDb.roles = user.roles || userDb.roles;
    if (user.roles) {
      userDb.roles = user.roles;
    }

    await userDb.save();

    this.logger.log(`From DB, Updated User with id: ${id}`);
  }

  // user-initiated updates
  async patchUserById(id: string, partialUser: Partial<User>): Promise<void> {
    const userDb = await this.userModel.findById(id);

    if (!userDb) {
      throw new NotFoundException(`User with id ${id} does not exist`);
    }

    // Only update fields that are provided
    // Check if the username is being updated
    if (partialUser.username && partialUser.username !== userDb.username) {
      // Query the database to check if the new username is taken
      const existingUser = await this.userModel.findOne({
        username: partialUser.username,
      });

      if (existingUser) {
        throw new ConflictException(
          `Username ${partialUser.username} already exists`,
        );
      }
      userDb.username = partialUser.username;
    }
    if (partialUser.password) {
      userDb.password = await this.authService.hashPassword(
        partialUser.password,
      );
    }
    if (partialUser.roles) {
      userDb.roles = partialUser.roles;
    }

    await userDb.save();

    this.logger.log(`From DB, Partially Updated User with id: ${id}`);
  }

  async deleteUserById(id: string): Promise<void> {
    const userExists = await this.userModel.exists({ _id: id });

    if (!userExists) {
      throw new NotFoundException(`User with id ${id} does not exist`);
    }

    await this.userModel.findByIdAndDelete(id);

    this.logger.log(`"From DB, Deleted Team with id: ${id}`);
  }
}
