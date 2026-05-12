import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import * as schema from "@bucketdrive/shared/db/schema"
import { existsSync, mkdirSync } from "fs"
import { resolve, dirname } from "path"

const DB_PATH = resolve(__dirname, "../apps/api/.db/local.sqlite")

function main() {
  console.log("Applying migrations...")

  const dir = dirname(DB_PATH)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const sqlite = new Database(DB_PATH)
  sqlite.pragma("foreign_keys = ON")

  const db = drizzle(sqlite, { schema })

  migrate(db, {
    migrationsFolder: resolve(__dirname, "../packages/shared/src/db/migrations"),
  })

  console.log("Migrations applied successfully")
  sqlite.close()
}

main()
