/* eslint-disable no-console */
import { spawnSync } from "child_process"

const result = spawnSync("tsx", ["scripts/env.ts", "check", "staging"], {
  stdio: "inherit",
  shell: process.platform === "win32",
})

process.exit(result.status ?? 1)
