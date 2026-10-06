import { HttpStatus, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

/** Точка входа серверной части приложения */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { cors: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:5173').split(','),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Response-Time'],
  });

  /**
   * Глобальный конвейер проверки входных данных.
   * whitelist отбрасывает поля, не описанные в DTO, forbidNonWhitelisted
   * превращает их наличие в ошибку, transform включает преобразование
   * простых объектов запроса в экземпляры классов DTO.
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ToolShop API')
    .setDescription(
      'Программный интерфейс клиент-серверного приложения «Интернет-магазин инструментов». ' +
        'Курсовая работа по дисциплине «Клиент-серверное программирование», вариант 24.',
    )
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'ToolShop API — спецификация',
    swaggerOptions: { persistAuthorization: true },
  });

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(`Сервер запущен: http://localhost:${port}/api`);
  logger.log(`Спецификация API: http://localhost:${port}/api/docs`);
}

void bootstrap();
