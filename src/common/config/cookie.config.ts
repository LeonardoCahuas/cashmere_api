export const cookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax", // Cambiato da 'strict' a 'lax' per development
  domain: process.env.NODE_ENV === "production" 
    ? process.env.COOKIE_DOMAIN 
    : "localhost", // Esplicitamente impostato per development
  path: "/",
  maxAge: 24 * 60 * 60 * 1000, // 24 ore
} as const