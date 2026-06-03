/* eslint-disable no-console */
import { existsSync, readFileSync, writeFileSync } from "fs"
import { resolve } from "path"

const wranglerPath = resolve(process.cwd(), "wrangler.toml")
const stagingD1Id = process.env.STAGING_D1_DATABASE_ID?.trim() || process.env.D1_DATABASE_ID?.trim()

if (!existsSync(wranglerPath)) {
  console.error("Missing wrangler.toml.")
  process.exit(1)
}

if (!stagingD1Id) {
  console.log("No STAGING_D1_DATABASE_ID provided; leaving wrangler.toml unchanged.")
  process.exit(0)
}

const wrangler = readFileSync(wranglerPath, "utf8")
const next = wrangler.replace(
  /(\[\[env\.staging\.d1_databases\]\][\s\S]*?database_id\s*=\s*")([^"]*)(")/,
  (_match: string, prefix: string, _current: string, suffix: string) =>
    `${prefix}${stagingD1Id}${suffix}`,
)

if (next === wrangler) {
  console.error("Could not locate env.staging.d1_databases.database_id in wrangler.toml.")
  process.exit(1)
}

writeFileSync(wranglerPath, next)
console.log("Prepared wrangler.toml with staging D1 database id from environment.")
