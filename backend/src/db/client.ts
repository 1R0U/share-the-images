import { Kysely } from 'kysely'
import { D1Dialect } from 'kysely-d1'
import type { Database } from './types'

interface R2BucketLike {
  put: (key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob) => Promise<unknown>
}

export interface D1Bindings {
  DB: unknown
  MEDIA_BUCKET: R2BucketLike
  PUBLIC_R2_BASE_URL?: string
  CRON_SECRET?: string
}

export const createDb = (env: D1Bindings) => {
  return new Kysely<Database>({
    dialect: new D1Dialect({
      database: env.DB as never,
    }),
  })
}
