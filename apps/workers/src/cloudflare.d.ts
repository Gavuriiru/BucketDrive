interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = unknown>(): Promise<T | null>
  run<T = unknown>(): Promise<T>
  all<T = unknown>(): Promise<T>
  raw<T = unknown>(): Promise<T[]>
}

interface D1Database {
  prepare(query: string): D1PreparedStatement
}

interface R2ObjectBody {
  body: ReadableStream<Uint8Array> | null
}

interface R2Bucket {
  delete(key: string): Promise<void>
  get(key: string): Promise<R2ObjectBody | null>
  put(key: string, value: ReadableStream<Uint8Array> | ArrayBuffer | ArrayBufferView | string | null): Promise<unknown>
}

interface ScheduledEvent {
  scheduledTime: number
  cron: string
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
}
