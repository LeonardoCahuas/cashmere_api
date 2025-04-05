import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { ValidationPipe } from "@nestjs/common"
import { json } from "express"
import * as cookieParser from "cookie-parser"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Configurazione CORS compatibile con Vercel
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["https://cashmere-web.vercel.app"]

  app.enableCors({
    origin: (origin, callback) => {
      // Permetti richieste senza origin (come mobile app o curl)
      if (!origin) {
        callback(null, true)
        return
      }

      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        callback(null, true)
      } else {
        callback(new Error("Not allowed by CORS"))
      }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
    allowedHeaders: "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  })

  // Cookie parser
  app.use(cookieParser())

  // JSON payload size increase
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
  console.log(`✅ Application is running on: http://localhost:${port}`)
}

bootstrap()

export default bootstrap

