import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { organization } from "better-auth/plugins"
import { createD1DB } from "./db"

interface AuthEnv {
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  DB: D1Database
}

export function createAuth(env: AuthEnv) {
  return betterAuth({
    database: drizzleAdapter(createD1DB(env.DB), { provider: "sqlite" }),
    session: {
      expiresIn: 30 * 24 * 60 * 60,
      updateAge: 24 * 60 * 60,
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    cookie: {
      name: "__bucketdrive_session",
      attributes: {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
      },
    },
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID ?? "",
        clientSecret: env.GITHUB_CLIENT_SECRET ?? "",
      },
      google: {
        clientId: env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
      },
    },
    plugins: [organization()],
  })
}
