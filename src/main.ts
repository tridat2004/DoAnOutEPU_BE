import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from './common/exceptions/exception-handler';
import { AppErrors } from './common/exceptions/exception';
import { AppModule } from './app.module';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api/v1';

  app.setGlobalPrefix(globalPrefix);

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => AppErrors.common.validation(errors),
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Task Core Service API')
    .setDescription('OpenAPI documentation for the Task Core Service.')
    .setVersion('1.0.0')
    .addCookieAuth(
      'access_token',
      {
        type: 'apiKey',
        in: 'cookie',
        description: 'Access token cookie returned after a successful login.',
      },
      'access_token',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup(`${globalPrefix}/docs`, app, swaggerDocument, {
    customSiteTitle: 'Task Core Service Docs',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
