import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import type { INestApplication } from '@nestjs/common';
import type { VercelRequest, VercelResponse } from '@vercel/node';

dotenv.config();

let app: INestApplication | undefined;

async function bootstrap(): Promise<INestApplication> {
  if (!app) {
    app = await NestFactory.create(AppModule);
    
    app.enableCors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();
  }
  return app;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const app = await bootstrap();
  const instance = app.getHttpAdapter().getInstance();
  return instance(req, res);
} 