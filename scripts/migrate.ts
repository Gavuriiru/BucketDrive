import initSqlJs from "sql.js"
import { drizzle } from "drizzle-orm/sql-js"
import { migrate } from "drizzle-orm/sql-js/migrator"
import * as schema from "@bucketdrive/shared/db/schema"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { resolve, dirname } from "path"

const DB_PATH = resolve(__dirname, "../apps/api/.db/local.sqlite")

async function main() {
  console.log("Applying migrations...")

  const dir = dirname(DB_PATH)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const SQL = await initSqlJs()

  let dbBuffer: Buffer | null = null
  if (existsSync(DB_PATH)) {
    dbBuffer = readFileSync(DB_PATH)
  }
  const sqlite = new SQL.Database(dbBuffer)

  sqlite.run("PRAGMA foreign_keys = ON")

  const db = drizzle(sqlite, { schema })

  migrate(db, {
    migrationsFolder: resolve(__dirname, "../packages/shared/src/db/migrations"),
  })

  const data = sqlite.export()
  writeFileSync(DB_PATH, Buffer.from(data))

  console.log("Migrations applied successfully")
  sqlite.close()
}

main().catch(console.error)
