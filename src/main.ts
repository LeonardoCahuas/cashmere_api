import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { ValidationPipe } from "@nestjs/common"
import { json } from "express"
import cookieParser from "cookie-parser"
import { PrismaClient } from "@prisma/client"

// Singleton PrismaClient per connection pooling
let prisma: PrismaClient | undefined = undefined

// Variabile per memorizzare l'istanza dell'app NestJS
let app: any

// Funzione per ottenere l'istanza di PrismaClient
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
      // Configurazione del connection pool
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Configurazione avanzata del pool di connessioni
      // Questi valori possono essere regolati in base al carico dell'applicazione
      //@ts-ignore
      __internal: {
        engine: {
          connectionLimit: 10, // Numero massimo di connessioni nel pool
          poolTimeout: 30, // Timeout in secondi per le connessioni inutilizzate
          idle_in_transaction_session_timeout: 30, // Timeout per transazioni inattive
        },
      },
    })
    
    // Gestione degli eventi di chiusura dell'applicazione per rilasciare le connessioni
    process.on('beforeExit', async () => {
      await prisma?.$disconnect()
    })
  }
  return prisma
}

async function bootstrap() {
  // Riutilizza l'istanza dell'app se esiste già (importante per serverless)
  if (!app) {
    app = await NestFactory.create(AppModule)

    // Configurazione CORS compatibile con Vercel
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["https://cashmere-web.vercel.app"]

    app.enableCors({
      origin: process.env.NODE_ENV === "production" 
        ? allowedOrigins 
        : "https://cashmere-web.vercel.app",
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
      credentials: true,
      allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
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
  }

  // Solo per ambiente di sviluppo o quando eseguito direttamente
  if (process.env.NODE_ENV !== "production" || require.main === module) {
    const port = 3005//process.env.PORT || 3005
    await app.listen(port)
    console.log(`✅ Application is running on: http://localhost:${port}`)
  }

  return app
}

// Per avvio tradizionale (non serverless)
if (require.main === module) {
  bootstrap()
}

// Per ambiente serverless Vercel
export default async function handler(req: any, res: any) {
  const nestApp = await bootstrap()
  const server = nestApp.getHttpAdapter().getInstance()
  
  // Middleware per assicurarsi che le connessioni siano gestite correttamente
  return server(req, res)
}