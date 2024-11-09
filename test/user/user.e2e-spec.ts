import { HttpStatus, INestApplication } from '@nestjs/common';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let user1;
  let user2;

  // beforeEach - setup mock users
  beforeEach(async () => {
    user1 = {
      username: 'user1',
      password: 'pass1',
      roles: ['user'],
    };
    user2 = {
      username: 'user2',
      password: 'pass2',
      roles: ['user'],
    };

    // const connection = app.get(getConnectionToken());
    // await connection.collection('users').insertMany([user1, user2]); // Setup mock users
  });

  // beforeAll - connect to in-memory db
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(mongoUri), AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  // afterEach - Clear all test data after every test.
  afterEach(async () => {
    const connection = app.get(getConnectionToken());
    const collections = connection.collections;

    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({}); // Clear all documents in the collection
    }
  });

  // afterAll - remove & close the db and server
  afterAll(async () => {
    await mongoServer.stop();
    await app.close();
  });

  describe('[GET] /api/v1/user', () => {
    it('givenUsers_whenGetAllUsers_thenStatusOkAndBodyCorrect', async () => {
      // given
      await app
        .get(getConnectionToken())
        .collection('users')
        .insertMany([user1, user2]);

      // when
      const response = await request(app.getHttpServer()).get('/api/v1/user/');

      // then
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].username).toBe('user1');
      expect(response.body[1].username).toBe('user2');
    });

    it('givenNothing_whenGetAllUsers_thenStatusNoContent', async () => {
      // given

      // when
      const response = await request(app.getHttpServer()).get('/api/v1/user/');

      // then
      expect(response.status).toBe(HttpStatus.NO_CONTENT);
      expect(response.body).toEqual({});
    });
  });

  describe('[GET] /api/v1/user/:id', () => {
    it('givenUser_whenGetUserById_thenStatusOkAndBodyCorrect', async () => {
      // given
      const { insertedId } = await app
        .get(getConnectionToken())
        .collection('users')
        .insertOne(user1);

      // when
      const response = await request(app.getHttpServer()).get(
        `/api/v1/user/${insertedId}`,
      );

      // then
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.username).toBe('user1');
    });

    it('givenNothing_whenGetUserById_thenStatusNotFound', async () => {
      // given

      // when
      const response = await request(app.getHttpServer()).get('/api/v1/user/1');

      // then
      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('[POST] /api/v1/user/', () => {
    it('givenUser_whenCreateUser_thenStatusCreated', async () => {
      // given
      const mockRequest = request(app.getHttpServer())
        .post(`/api/v1/user/`)
        .send(user1)
        .set('Accept', 'application/json');

      // when
      const response = await mockRequest;

      // then
      expect(response.status).toBe(HttpStatus.CREATED);
    });

    it('givenUserWithSameName_whenCreateUser_thenStatusBadRequest', async () => {
      // given
      await app.get(getConnectionToken()).collection('users').insertOne(user1);

      // when
      const response = await request(app.getHttpServer())
        .post(`/api/v1/user/`)
        .send(user1) // Send the newUser data
        .set('Accept', 'application/json');

      // then
      expect(response.status).toBe(HttpStatus.CONFLICT);
    });
  });

  describe('[PUT] /api/v1/user/:id', () => {
    it('givenUser_whenUpdateUserById_thenStatusOk', async () => {
      // given
      const { insertedId } = await app
        .get(getConnectionToken())
        .collection('users')
        .insertOne(user1);

      const updatedUser1 = {
        username: 'updatedUser1',
        password: 'updatedPassword1',
        roles: ['user', 'admin'],
      };

      // when
      const response = await request(app.getHttpServer())
        .put(`/api/v1/user/${insertedId}`)
        .send(updatedUser1);

      // then
      expect(response.status).toBe(HttpStatus.OK);
    });

    it('givenUser_whenUpdateUserByIdWithWrongId_thenStatusBadRequest', async () => {
      // given
      await app.get(getConnectionToken()).collection('users').insertOne(user1);
      const wrongId = '60d5f9f5319a5c1d4c8e7b60';

      const updatedUser1 = {
        username: 'updatedUser1',
        password: 'updatedPassword1',
        roles: ['user', 'admin'],
      };

      // when
      const response = await request(app.getHttpServer())
        .put(`/api/v1/user/${wrongId}`)
        .send(updatedUser1);

      // then
      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('givenUserWithSameUsername_whenUpdateUserById_thenStatusConflict', async () => {
      // given
      const { insertedIds } = await app
        .get(getConnectionToken())
        .collection('users')
        .insertMany([user1, user2]);

      // const user1Id = insertedIds[0];
      const user2Id = insertedIds[1];

      const updatedUser2 = {
        username: 'user1',
        password: 'updatedPassword2',
        roles: ['user', 'admin'],
      };

      // when
      const response = await request(app.getHttpServer())
        .put(`/api/v1/user/${user2Id}`)
        .send(updatedUser2);

      // then
      expect(response.status).toBe(HttpStatus.CONFLICT);
    });
  });

  describe('[PATCH] /api/v1/user/:id', () => {
    it('givenPartialUser_whenPatchUserById_thenStatusOk', async () => {
      // given
      const { insertedId } = await app
        .get(getConnectionToken())
        .collection('users')
        .insertOne(user1);

      const partialUser1 = {
        username: 'updatedUser1',
      };

      // when
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/user/${insertedId}`)
        .send(partialUser1);

      // then
      expect(response.status).toBe(HttpStatus.OK);
    });

    it('givenNonExistentUser_whenPatchUserById_thenStatusNotFound', async () => {
      // given
      await app.get(getConnectionToken()).collection('users').insertOne(user1);
      const nonExistentUserId = '60d5f9f5319a5c1d4c8e7b60';

      const updatedUser1 = {
        username: 'updatedUser1',
      };

      // when
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/user/${nonExistentUserId}`)
        .send(updatedUser1);

      // then
      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('givenPartialUserWithExistingUsername_whenPatchUserById_thenStatusConflict', async () => {
      // given
      const { insertedIds } = await app
        .get(getConnectionToken())
        .collection('users')
        .insertMany([user1, user2]);

      // const user1Id = insertedIds[0];
      const user2Id = insertedIds[1];

      const partialUser2 = {
        username: 'user1',
      };

      // when
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/user/${user2Id}`)
        .send(partialUser2);

      // then
      expect(response.status).toBe(HttpStatus.CONFLICT);
    });

    it('givenPartialUserRoles_whenPatchUserById_thenStatusOkAndRolesUpdated', async () => {
      // given
      const { insertedId } = await app
        .get(getConnectionToken())
        .collection('users')
        .insertOne(user1);

      const partialUser = {
        roles: ['user', 'admin'],
      };

      // when
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/user/${insertedId}`)
        .send(partialUser);

      // then
      expect(response.status).toBe(HttpStatus.OK);
    });
  });

  describe('[DELETE] /api/v1/user/:id', () => {
    it('givenUser_whenDeleteUserById_thenStatusNoContent', async () => {
      // given
      const { insertedId } = await app
        .get(getConnectionToken())
        .collection('users')
        .insertOne(user1);

      // when
      const response = await request(app.getHttpServer()).delete(
        `/api/v1/user/${insertedId}`,
      );

      // then
      expect(response.status).toBe(HttpStatus.NO_CONTENT);
    });

    it('givenUser_whenDeleteUserByIdWithWrongId_thenStatusBadRequest', async () => {
      // given
      await app.get(getConnectionToken()).collection('users').insertOne(user1);
      const wrongId = '60d5f9f5319a5c1d4c8e7b60';

      // when
      const response = await request(app.getHttpServer()).delete(
        `/api/v1/user/${wrongId}`,
      );

      // then
      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });
  });
});
