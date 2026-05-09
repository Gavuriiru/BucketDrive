import { drizzle } from "drizzle-orm/d1"
import * as schema from "@bucketdrive/shared/db/schema"

let db: ReturnType<typeof drizzle<typeof schema>>

export function createD1DB(binding: D1Database) {
  if (!db) {
    db = drizzle(binding, { schema })
  }
  return db
}

export function getDB() {
  if (!db) throw new Error("Database not initialized. Call createD1DB first.")
  return db
}
