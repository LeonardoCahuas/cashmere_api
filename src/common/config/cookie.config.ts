import type { CookieOptions } from "express"

export const cookieConfig: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  domain: process.env.COOKIE_DOMAIN || undefined,
  path: "/",
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
}

