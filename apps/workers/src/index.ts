import { createD1DB, getDB } from "../../api/src/lib/db"
import { createStorageProvider } from "../../api/src/services/storage"
import { TrashService } from "../../api/src/services/trash.service"

interface Env {
  DB: D1Database
  STORAGE: R2Bucket
  R2_ACCESS_KEY_ID?: string
  R2_SECRET_ACCESS_KEY?: string
  R2_ENDPOINT?: string
}

export default {
  fetch() {
    return new Response("bucketdrive-workers", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    })
  },

  scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runTrashCleanup(env))
  },
}

async function runTrashCleanup(env: Env) {
  createD1DB(env.DB)
  const storage = createStorageProvider(env)
  const trashService = new TrashService(getDB(), storage)
  const result = await trashService.purgeExpiredTrash("system")

  console.warn(
    `Trash cleanup completed: purgedFiles=${String(result.purgedFiles)} purgedFolders=${String(result.purgedFolders)}`,
  )
}
