import { HttpStatus, INestApplication } from '@nestjs/common';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as request from 'supertest';

import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let accessTokenAdmin: string;
  let accessTokenUser: string;
  let configService: ConfigService;

  // beforeAll - connect to in-memory db
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(mongoUri), AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configService = app.get(ConfigService); // Ensure ConfigService is available

    await app.init();
  });

  // afterEach - Clear all test data after every test.
  afterEach(async () => {
    const connection = app.get(getConnectionToken());
    const collections = connection.collections;

    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });

  // afterAll - remove & close the db and server
  afterAll(async () => {
    await mongoServer.stop();
    await app.close();
  });

  describe('[POST] /api/v1/auth/login', () => {
    it('givenValidCredentials_whenLogin_thenStatusOkAndTokenReturned', async () => {
      // given - create user with valid credentials
      // Retrieve salt rounds from the environment variable
      const saltRounds = Number(
        configService.get<number>('BCRYPT_SALT_ROUNDS'),
      );
      const hashedPassword = await bcrypt.hash('adminPass', saltRounds); // assuming 10 rounds
      await app
        .get(getConnectionToken())
        .collection('users')
        .insertOne({
          username: 'adminUser',
          password: hashedPassword,
          roles: ['admin'],
        });

      // when
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'adminUser', password: 'adminPass' })
        .set('Accept', 'application/json');

      // then
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.access_token).toBeDefined();
    });

    it('givenNonExistentUser_whenLogin_thenStatusNotFound', async () => {
      // given - invalid credentials
      const saltRounds = Number(
        configService.get<number>('BCRYPT_SALT_ROUNDS'),
      );
      const hashedPassword = await bcrypt.hash('correctPassword', saltRounds);
      await app
        .get(getConnectionToken())
        .collection('users')
        .insertOne({
          username: 'adminUser',
          password: hashedPassword,
          roles: ['admin'],
        });

      // when
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'wrongUser', password: 'wrongPass' });

      // then
      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body.message).toBe(
        'User with name wrongUser does not exist',
      ); // Ensure message is correct
    });

    it('givenInvalidCredentials_whenLogin_thenStatusUnauthorized', async () => {
      // given - invalid credentials
      const saltRounds = Number(
        configService.get<number>('BCRYPT_SALT_ROUNDS'),
      );
      const hashedPassword = await bcrypt.hash('correctPassword', saltRounds);
      await app
        .get(getConnectionToken())
        .collection('users')
        .insertOne({
          username: 'adminUser',
          password: hashedPassword,
          roles: ['admin'],
        });

      // when
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'adminUser', password: 'wrongPass' });

      // then
      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('[GET] /api/v1/auth/profile', () => {
    it('givenValidToken_whenGetProfile_thenStatusOkAndUserReturned', async () => {
      // given - log in to get accessToken
      const saltRounds = Number(
        configService.get<number>('BCRYPT_SALT_ROUNDS'),
      );
      const hashedPassword = await bcrypt.hash('userPass', saltRounds);

      await app
        .get(getConnectionToken())
        .collection('users')
        .insertOne({
          username: 'regularUser',
          password: hashedPassword,
          roles: ['user'],
        });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'regularUser', password: 'userPass' });
      accessTokenUser = loginResponse.body.access_token;

      // when
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessTokenUser}`);

      // then
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.username).toBe('regularUser');
    });

    it('givenNoToken_whenGetProfile_thenStatusUnauthorized', async () => {
      // given - no token provided

      // when
      const response = await request(app.getHttpServer()).get(
        '/api/v1/auth/profile',
      );

      // then
      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('[GET] /api/v1/auth/admin', () => {
    it('givenAdminRole_whenGetAdmin_thenStatusOk', async () => {
      // given - valid admin token (accessTokenAdmin)
      const saltRounds = Number(
        configService.get<number>('BCRYPT_SALT_ROUNDS'),
      );
      const hashedPassword = await bcrypt.hash('adminPass', saltRounds);

      await app
        .get(getConnectionToken())
        .collection('users')
        .insertOne({
          username: 'adminUser',
          password: hashedPassword,
          roles: ['admin'],
        });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'adminUser', password: 'adminPass' });
      accessTokenAdmin = loginResponse.body.access_token;

      // when
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/admin')
        .set('Authorization', `Bearer ${accessTokenAdmin}`);

      // then
      expect(response.status).toBe(HttpStatus.OK);
    });

    it('givenUserRole_whenGetAdmin_thenStatusForbidden', async () => {
      // given - user role token (accessTokenUser)
      const saltRounds = Number(
        configService.get<number>('BCRYPT_SALT_ROUNDS'),
      );
      const hashedPassword = await bcrypt.hash('userPass', saltRounds);

      await app
        .get(getConnectionToken())
        .collection('users')
        .insertOne({
          username: 'regularUser',
          password: hashedPassword,
          roles: ['user'],
        });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'regularUser', password: 'userPass' });
      accessTokenUser = loginResponse.body.access_token;

      // when
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/admin')
        .set('Authorization', `Bearer ${accessTokenUser}`);

      // then
      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });

    it('givenNoToken_whenGetAdmin_thenStatusUnauthorized', async () => {
      // given - no token

      // when
      const response = await request(app.getHttpServer()).get(
        '/api/v1/auth/admin',
      );

      // then
      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('[GET] /api/v1/auth/user', () => {
    it('givenUserRole_whenGetUser_thenStatusOk', async () => {
      // given - user role token (accessTokenUser)
      const saltRounds = Number(
        configService.get<number>('BCRYPT_SALT_ROUNDS'),
      );
      const hashedPassword = await bcrypt.hash('userPass', saltRounds);

      await app
        .get(getConnectionToken())
        .collection('users')
        .insertOne({
          username: 'userRoleUser',
          password: hashedPassword,
          roles: ['user'],
        });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'userRoleUser', password: 'userPass' });
      accessTokenUser = loginResponse.body.access_token;

      // when
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/user')
        .set('Authorization', `Bearer ${accessTokenUser}`);

      // then
      expect(response.status).toBe(HttpStatus.OK);
    });

    it('givenAdminRole_whenGetUser_thenStatusForbidden', async () => {
      // given - admin role token (accessTokenAdmin)
      const saltRounds = Number(
        configService.get<number>('BCRYPT_SALT_ROUNDS'),
      );
      const hashedPassword = await bcrypt.hash('adminPass', saltRounds);

      await app
        .get(getConnectionToken())
        .collection('users')
        .insertOne({
          username: 'adminUser',
          password: hashedPassword,
          roles: ['admin'],
        });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'adminUser', password: 'adminPass' });
      accessTokenAdmin = loginResponse.body.access_token;

      // when
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/user')
        .set('Authorization', `Bearer ${accessTokenAdmin}`);

      // then
      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });

    it('givenNoToken_whenGetUser_thenStatusUnauthorized', async () => {
      // given - no token

      // when
      const response = await request(app.getHttpServer()).get(
        '/api/v1/auth/user',
      );

      // then
      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });
});
