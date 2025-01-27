import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

let app: NestExpressApplication;

async function bootstrap() {
  if (!app) {
    app = await NestFactory.create<NestExpressApplication>(AppModule);

    app.enableCors({
      origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
      credentials: true,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      })
    );

    await app.init();
  }
  return app;
}

export default async function handler(req: any, res: any) {
  try {
    const app = await bootstrap();
    const expressApp = app.getHttpAdapter().getInstance();
    
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);

    return new Promise((resolve, reject) => {
      expressApp(req, res, (err: any) => {
        if (err) {
          console.error('Request error:', err);
          reject(err);
        }
        resolve(undefined);
      });
    });
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}