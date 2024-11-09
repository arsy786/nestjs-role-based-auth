import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { User } from '../model/user.schema';
import { UserService } from '../services/user.service';

@Controller('/api/v1/user')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Get('/')
  async getAllUsers(@Res() res: Response): Promise<Response> {
    this.logger.log('Received GET /api/v1/user request.');

    const users = await this.userService.getAllUsers();

    if (!users || users.length === 0) {
      return res.status(HttpStatus.NO_CONTENT).json(users);
    }

    this.logger.debug('Posted service response for getAllUsers.');

    return res.status(HttpStatus.OK).json(users);
  }

  @Get('/:id')
  async getUserById(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<Response> {
    this.logger.log(`Received GET /api/v1/user/${id} request.`);

    const user = await this.userService.getUserById(id);

    if (user == null) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: `User with id ${id} is empty.`,
      });
    }

    this.logger.debug('Posted service response for getUserById.');

    return res.status(HttpStatus.OK).json(user);
  }

  @Post('/')
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body() user: Partial<User>,
    @Res() response: Response,
  ): Promise<void> {
    this.logger.log(`Received POST /api/v1/user/ request.`);

    await this.userService.createUser(user);

    this.logger.debug(`Posted service response for createUser.`);

    response.status(HttpStatus.CREATED).json(); // Handle response here
  }

  @Put('/:id')
  async updateUserById(
    @Param('id') id: string,
    @Body() user: User,
    @Res() response: Response,
  ): Promise<void> {
    this.logger.log(`Received PUT /api/v1/user/${id} request.`);

    await this.userService.updateUserById(id, user);

    this.logger.debug(`Posted service response for updateUserById.`);

    response.status(HttpStatus.OK).json(); // Handle response here
  }

  @Patch('/:id')
  async patchUserById(
    @Param('id') id: string,
    @Body() partialUser: Partial<User>,
    @Res() response: Response,
  ): Promise<void> {
    this.logger.log(`Received PATCH /api/v1/user/${id} request.`);

    await this.userService.patchUserById(id, partialUser);

    this.logger.debug(`Posted service response for patchUserById.`);

    response.status(HttpStatus.OK).json(); // Handle response here
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUserById(@Param('id') id: string): Promise<void> {
    this.logger.log(`Received DELETE /api/v1/user/${id} request.`);

    await this.userService.deleteUserById(id);

    this.logger.debug(`Posted service response for deleteUserById.`);
  }
}
