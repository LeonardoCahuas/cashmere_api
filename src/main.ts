import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { ValidationPipe } from "@nestjs/common"
import { json } from "express"
import * as cookieParser from "cookie-parser"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Configurazione CORS corretta che include cache-control
  app.enableCors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "cache-control",
      "user-agent",
      "sec-ch-ua",
      "sec-ch-ua-mobile",
      "sec-ch-ua-platform",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })

  // Cookie parser middleware
  app.use(cookieParser())

  // Increase JSON payload limit
  app.use(json({ limit: "50mb" }))

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )

  const port = process.env.PORT || 3005
  await app.listen(port)
  console.log(`Application is running on: http://localhost:${port}`)
}

bootstrap()

export default bootstrap

