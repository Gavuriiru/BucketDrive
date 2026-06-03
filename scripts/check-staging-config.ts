/* eslint-disable no-console */
import { existsSync, readFileSync } from "fs"
import { resolve } from "path"

const wranglerPath = resolve(process.cwd(), "wrangler.toml")

if (!existsSync(wranglerPath)) {
  console.error("Missing wrangler.toml.")
  process.exit(1)
}

const wrangler = readFileSync(wranglerPath, "utf8")
const stagingD1Match = wrangler.match(
  /\[\[env\.staging\.d1_databases\]\][\s\S]*?database_id\s*=\s*"([^"]*)"/,
)
const stagingD1Id =
  stagingD1Match?.[1]?.trim() ||
  process.env.STAGING_D1_DATABASE_ID?.trim() ||
  process.env.D1_DATABASE_ID?.trim()

if (!stagingD1Id) {
  console.error(
    [
      "Missing staging D1 database id.",
      "Create staging D1 with `npx wrangler d1 create bucketdrive-db-staging`, then set STAGING_D1_DATABASE_ID in GitHub environment vars or set env.staging.d1_databases.database_id in wrangler.toml.",
    ].join("\n"),
  )
  process.exit(1)
}

const requiredEnv = ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"]
const missing = requiredEnv.filter((key) => !process.env[key]?.trim())

if (missing.length > 0) {
  console.error(`Missing required deploy env var(s): ${missing.join(", ")}`)
  process.exit(1)
}

console.log("Staging deploy config is present.")
