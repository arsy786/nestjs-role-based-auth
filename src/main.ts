import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import mongoose from 'mongoose';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new ApiExceptionFilter());

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Your API Title')
    .setDescription('Your API description')
    .setVersion('1.0')
    .addTag('Your API Tag')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document); // Serve Swagger docs at /api/docs

  const logger = new Logger(bootstrap.name); // Create logger instance once

  const mongooseInstance = mongoose.createConnection(process.env.MONGODB_URI);

  // Log MongoDB connection status
  mongooseInstance.on('connected', async () => {
    logger.log('Successfully connected to MongoDB');

    // Log the database name
    const dbs = mongooseInstance.db.databaseName;
    const collections = await mongooseInstance.db.listCollections().toArray();
    const collectionNames = collections.map((col) => col.name);
    logger.log(`Connected to database: ${dbs}`);
    logger.log(`With collections: ${collectionNames.join(', ')}`); // Join names for better readability
  });

  const PORT = process.env.PORT || 3000;
  await app.listen(PORT);
  logger.log(`Application is running on: http://localhost:${PORT}`);
}

bootstrap();
