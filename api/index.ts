import { NestFactory } from "@nestjs/core"
import { AppModule } from "../src/app.module"
import { ValidationPipe } from "@nestjs/common"
import type { NestExpressApplication } from "@nestjs/platform-express"
import * as cookieParser from "cookie-parser"

let app: NestExpressApplication

async function createApp(): Promise<NestExpressApplication> {
  const nestApp = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ["error", "warn", "log"], // Ridotto per evitare log eccessivi
    bodyParser: true,
  })

  // Configurazione CORS
  nestApp.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
    allowedHeaders: "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  })

  // Cookie parser
  nestApp.use(cookieParser())

  // Validation pipe
  nestApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )

  await nestApp.init()

  console.log("NestJS application initialized successfully")
  return nestApp
}

export default async function handler(req: any, res: any) {
  try {
    if (!app) {
      app = await createApp()
    }

    // Gestione speciale per le richieste OPTIONS (preflight CORS)
    if (req.method === "OPTIONS") {
      res.status(200).send("OK")
      return
    }

    const expressApp = app.getHttpAdapter().getInstance()

    // Log limitati per evitare di riempire i log
    if (process.env.DEBUG === "true") {
      console.log(`Request: ${req.method} ${req.url}`)
      if (req.body && Object.keys(req.body).length > 0) {
        console.log("Request body:", JSON.stringify(req.body).substring(0, 200) + "...")
      }
    }

    return new Promise((resolve, reject) => {
      expressApp(req, res, (err: any) => {
        if (err) {
          console.error("Request error:", err)
          // Non rejectare la promise, ma gestire l'errore qui
          res.status(500).json({
            error: "Internal server error",
            message: err.message || "Unknown error",
          })
          resolve(undefined)
        } else {
          resolve(undefined)
        }
      })
    })
  } catch (error) {
    console.error("Handler error:", error)
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

