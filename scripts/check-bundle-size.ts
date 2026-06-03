/* eslint-disable no-console */
import { existsSync, readdirSync, readFileSync, statSync } from "fs"
import { join, relative, resolve } from "path"
import { gzipSync } from "zlib"

const DIST_DIR = resolve(process.cwd(), "apps/web/dist")
const MAX_GZIP_BYTES = Number(process.env.BUNDLE_MAX_GZIP_BYTES ?? 500_000)

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    const stat = statSync(path)
    return stat.isDirectory() ? walk(path) : [path]
  })
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} kB`
}

if (!existsSync(DIST_DIR)) {
  console.error("Missing apps/web/dist. Run pnpm build before bundle analysis.")
  process.exit(1)
}

const jsFiles = walk(DIST_DIR).filter((file) => file.endsWith(".js"))
if (jsFiles.length === 0) {
  console.error("No JavaScript assets found in apps/web/dist.")
  process.exit(1)
}

const results = jsFiles
  .map((file) => {
    const gzipBytes = gzipSync(readFileSync(file)).byteLength
    return {
      file,
      gzipBytes,
      rawBytes: statSync(file).size,
    }
  })
  .sort((a, b) => b.gzipBytes - a.gzipBytes)

const failures = results.filter((asset) => asset.gzipBytes > MAX_GZIP_BYTES)

console.log(`Bundle gzip budget: ${formatBytes(MAX_GZIP_BYTES)} per JS asset`)
for (const asset of results) {
  console.log(
    `${relative(process.cwd(), asset.file)} gzip=${formatBytes(asset.gzipBytes)} raw=${formatBytes(asset.rawBytes)}`,
  )
}

if (failures.length > 0) {
  console.error(
    `Bundle budget exceeded by ${String(failures.length)} asset(s): ${failures
      .map((asset) => relative(process.cwd(), asset.file))
      .join(", ")}`,
  )
  process.exit(1)
}
