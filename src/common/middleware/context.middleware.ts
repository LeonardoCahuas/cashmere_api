import { Injectable, type NestMiddleware } from "@nestjs/common"
import type { Request, Response, NextFunction } from "express"
import { v4 as uuidv4 } from "uuid"

declare global {
  namespace Express {
    interface Request {
      requestId: string
      startTime: number
    }
  }
}

@Injectable()
export class ContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    req.requestId = uuidv4()
    req.startTime = Date.now()
    next()
  }
}

