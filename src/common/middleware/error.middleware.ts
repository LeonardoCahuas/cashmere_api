import { Injectable, type NestMiddleware } from "@nestjs/common"
import type { Request, Response, NextFunction } from "express"

@Injectable()
export class ErrorMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    res.on("finish", () => {
      const duration = Date.now() - req.startTime
      if (res.statusCode >= 400) {
        console.error(`[${req.requestId}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`)
      }
    })
    next()
  }
}

