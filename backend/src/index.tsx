import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createDb, type D1Bindings } from './db/client'
import {
  addMemberToCommunity,
  createCommunity,
  createMedia,
  createReaction,
  createRouletteHistory,
  getMonthRange,
  getMonthlyMediaStats,
  getRouletteShot,
  isValidMediaType,
  isValidMemberRole,
  listCommunityIds,
  listMediaByCommunityAndMonth,
  pickRandomPastMediaForRoulette,
  listReactionsByMediaIds,
  listUserCommunities,
} from './db/queries'
import { renderer } from './renderer'

const app = new Hono<{ Bindings: D1Bindings }>()

const toMonthYear = (date = new Date()) => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const runRouletteJob = async (env: D1Bindings, targetMonthYear: string) => {
  const db = createDb(env)
  const { start } = getMonthRange(targetMonthYear)
  const communities = await listCommunityIds(db)

  let created = 0
  let skipped = 0

  for (const community of communities) {
    const existing = await getRouletteShot(db, community.id, targetMonthYear)
    if (existing) {
      skipped += 1
      continue
    }

    const media = await pickRandomPastMediaForRoulette(db, community.id, start)
    if (!media) {
      skipped += 1
      continue
    }

    const history = await createRouletteHistory(db, {
      id: crypto.randomUUID(),
      community_id: community.id,
      media_id: media.id,
      target_month_year: targetMonthYear,
    })

    if (history) {
      created += 1
    } else {
      skipped += 1
    }
  }

  return {
    targetMonthYear,
    totalCommunities: communities.length,
    created,
    skipped,
  }
}

const toSafeExt = (mimeType: string, fallbackType: 'image' | 'video') => {
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'video/mp4') return 'mp4'
  if (mimeType === 'video/webm') return 'webm'
  return fallbackType === 'image' ? 'jpg' : 'mp4'
}

app.use(renderer)
app.use('/api/*', cors({ origin: '*' }))

app.get('/', (c) => {
  return c.render(<h1>Hello!</h1>)
})

app.get('/api/communities', async (c) => {
  const userId = c.req.query('userId')

  if (!userId) {
    return c.json({ error: 'userId is required' }, 400)
  }

  const db = createDb(c.env)
  const communities = await listUserCommunities(db, userId)

  return c.json({ communities })
})

app.post('/api/communities', async (c) => {
  const body = await c.req.json<{ name?: string; userId?: string }>().catch(() => null)

  const name = body?.name?.trim()
  const userId = body?.userId?.trim()

  if (!name || !userId) {
    return c.json({ error: 'name and userId are required' }, 400)
  }

  const db = createDb(c.env)
  const communityId = crypto.randomUUID()

  const community = await createCommunity(db, {
    id: communityId,
    name,
  })

  await addMemberToCommunity(db, {
    user_id: userId,
    community_id: communityId,
    role: 'owner',
  })

  return c.json({ community }, 201)
})

app.post('/api/communities/:communityId/members', async (c) => {
  const communityId = c.req.param('communityId')
  const body = await c.req.json<{ userId?: string; role?: string }>().catch(() => null)

  const userId = body?.userId?.trim()
  const role = (body?.role ?? 'member').trim()

  if (!communityId || !userId) {
    return c.json({ error: 'communityId and userId are required' }, 400)
  }

  if (!isValidMemberRole(role)) {
    return c.json({ error: 'role must be one of owner, admin, member' }, 400)
  }

  const db = createDb(c.env)
  const member = await addMemberToCommunity(db, {
    user_id: userId,
    community_id: communityId,
    role,
  })

  return c.json({ member }, 201)
})

app.get('/api/media', async (c) => {
  const communityId = c.req.query('communityId')
  const month = c.req.query('month')

  if (!communityId || !month) {
    return c.json({ error: 'communityId and month are required' }, 400)
  }

  try {
    const db = createDb(c.env)
    const media = await listMediaByCommunityAndMonth(db, communityId, month)

    return c.json({ media })
  } catch {
    return c.json({ error: 'month must be YYYY-MM format' }, 400)
  }
})

app.post('/api/media', async (c) => {
  const body = await c.req
    .json<{
      communityId?: string
      userId?: string
      type?: string
      r2Key?: string
      r2Url?: string
      durationSeconds?: number
      month?: string
    }>()
    .catch(() => null)

  const communityId = body?.communityId?.trim()
  const userId = body?.userId?.trim()
  const type = body?.type?.trim()
  const r2Key = body?.r2Key?.trim()
  const r2Url = body?.r2Url?.trim()
  const month = body?.month?.trim()
  const durationSeconds = body?.durationSeconds

  if (!communityId || !userId || !type || !r2Key || !r2Url || !month) {
    return c.json({ error: 'communityId, userId, type, r2Key, r2Url, month are required' }, 400)
  }

  if (!isValidMediaType(type)) {
    return c.json({ error: 'type must be image or video' }, 400)
  }

  if (type === 'video' && (!Number.isFinite(durationSeconds) || durationSeconds <= 0)) {
    return c.json({ error: 'durationSeconds is required for video' }, 400)
  }

  const db = createDb(c.env)

  let stats
  try {
    stats = await getMonthlyMediaStats(db, communityId, month)
  } catch {
    return c.json({ error: 'month must be YYYY-MM format' }, 400)
  }

  if (type === 'image' && stats.imageCount >= 50) {
    return c.json({ error: 'monthly image limit reached (50)' }, 409)
  }

  if (type === 'video' && stats.videoDurationSeconds + (durationSeconds ?? 0) > 300) {
    return c.json({ error: 'monthly video duration limit reached (300 seconds)' }, 409)
  }

  const media = await createMedia(db, {
    id: crypto.randomUUID(),
    community_id: communityId,
    user_id: userId,
    type,
    r2_key: r2Key,
    r2_url: r2Url,
    duration_seconds: type === 'video' ? Math.floor(durationSeconds ?? 0) : null,
  })

  return c.json({ media }, 201)
})

app.post('/api/media/upload', async (c) => {
  const form = await c.req.formData().catch(() => null)

  if (!form) {
    return c.json({ error: 'multipart/form-data is required' }, 400)
  }

  const communityId = String(form.get('communityId') ?? '').trim()
  const userId = String(form.get('userId') ?? '').trim()
  const type = String(form.get('type') ?? '').trim()
  const month = String(form.get('month') ?? '').trim()
  const durationSecondsRaw = String(form.get('durationSeconds') ?? '').trim()
  const file = form.get('file')

  if (!communityId || !userId || !type || !month || !file || !(file instanceof File)) {
    return c.json({ error: 'communityId, userId, type, month and file are required' }, 400)
  }

  if (!isValidMediaType(type)) {
    return c.json({ error: 'type must be image or video' }, 400)
  }

  if (type === 'image' && file.size > 1_200_000) {
    return c.json({ error: 'image is too large (max ~1.2MB). compress on client first' }, 413)
  }

  const durationSeconds = durationSecondsRaw ? Number(durationSecondsRaw) : undefined

  if (type === 'video' && (!Number.isFinite(durationSeconds) || Number(durationSeconds) <= 0)) {
    return c.json({ error: 'durationSeconds is required for video' }, 400)
  }

  const db = createDb(c.env)

  let stats
  try {
    stats = await getMonthlyMediaStats(db, communityId, month)
  } catch {
    return c.json({ error: 'month must be YYYY-MM format' }, 400)
  }

  if (type === 'image' && stats.imageCount >= 50) {
    return c.json({ error: 'monthly image limit reached (50)' }, 409)
  }

  if (type === 'video' && stats.videoDurationSeconds + (durationSeconds ?? 0) > 300) {
    return c.json({ error: 'monthly video duration limit reached (300 seconds)' }, 409)
  }

  const mediaId = crypto.randomUUID()
  const ext = toSafeExt(file.type, type)
  const r2Key = `communities/${communityId}/${month}/${mediaId}.${ext}`

  await c.env.MEDIA_BUCKET.put(r2Key, file)

  const base = (c.env.PUBLIC_R2_BASE_URL ?? '').replace(/\/$/, '')
  const r2Url = base ? `${base}/${r2Key}` : r2Key

  const media = await createMedia(db, {
    id: mediaId,
    community_id: communityId,
    user_id: userId,
    type,
    r2_key: r2Key,
    r2_url: r2Url,
    duration_seconds: type === 'video' ? Math.floor(durationSeconds ?? 0) : null,
  })

  return c.json({ media }, 201)
})

app.post('/api/media/upload-url', async (c) => {
  const body = await c.req
    .json<{
      communityId?: string
      type?: string
      month?: string
      fileName?: string
    }>()
    .catch(() => null)

  const communityId = body?.communityId?.trim()
  const type = body?.type?.trim()
  const month = body?.month?.trim()

  if (!communityId || !type || !month || !isValidMediaType(type)) {
    return c.json({ error: 'communityId, type(image|video), month are required' }, 400)
  }

  const extFromName = body?.fileName?.includes('.') ? body.fileName.split('.').pop() : undefined
  const mediaId = crypto.randomUUID()
  const ext = extFromName ?? (type === 'image' ? 'jpg' : 'mp4')
  const r2Key = `communities/${communityId}/${month}/${mediaId}.${ext}`
  const base = (c.env.PUBLIC_R2_BASE_URL ?? '').replace(/\/$/, '')

  return c.json({
    r2Key,
    r2Url: base ? `${base}/${r2Key}` : r2Key,
    uploadEndpoint: '/api/media/upload',
  })
})

app.get('/api/reactions', async (c) => {
  const mediaId = c.req.query('mediaId')

  if (!mediaId) {
    return c.json({ error: 'mediaId is required' }, 400)
  }

  const db = createDb(c.env)
  const reactions = await listReactionsByMediaIds(db, [mediaId])

  return c.json({ reactions })
})

app.get('/api/reactions/batch', async (c) => {
  const mediaIdsRaw = c.req.query('mediaIds')
  const mediaIds = mediaIdsRaw
    ? mediaIdsRaw
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    : []

  if (mediaIds.length === 0) {
    return c.json({ reactions: [] })
  }

  const db = createDb(c.env)
  const reactions = await listReactionsByMediaIds(db, mediaIds)

  return c.json({ reactions })
})

app.post('/api/reactions', async (c) => {
  const body = await c.req
    .json<{
      mediaId?: string
      userId?: string
      emojiType?: string
      commentText?: string
    }>()
    .catch(() => null)

  const mediaId = body?.mediaId?.trim()
  const userId = body?.userId?.trim()
  const emojiType = body?.emojiType?.trim() || null
  const commentText = body?.commentText?.trim() || null

  if (!mediaId || !userId) {
    return c.json({ error: 'mediaId and userId are required' }, 400)
  }

  if (!emojiType && !commentText) {
    return c.json({ error: 'emojiType or commentText is required' }, 400)
  }

  const db = createDb(c.env)
  const reaction = await createReaction(db, {
    id: crypto.randomUUID(),
    media_id: mediaId,
    user_id: userId,
    emoji_type: emojiType,
    comment_text: commentText,
  })

  return c.json({ reaction }, 201)
})

app.get('/api/roulette/current', async (c) => {
  const communityId = c.req.query('communityId')
  const month = c.req.query('month') ?? toMonthYear()

  if (!communityId) {
    return c.json({ error: 'communityId is required' }, 400)
  }

  try {
    const db = createDb(c.env)
    const shot = await getRouletteShot(db, communityId, month)
    return c.json({ shot })
  } catch {
    return c.json({ error: 'month must be YYYY-MM format' }, 400)
  }
})

app.post('/api/roulette/run', async (c) => {
  const body = await c.req.json<{ targetMonthYear?: string }>().catch(() => null)
  const targetMonthYear = body?.targetMonthYear?.trim() || toMonthYear()

  try {
    const result = await runRouletteJob(c.env, targetMonthYear)
    return c.json({ result })
  } catch {
    return c.json({ error: 'targetMonthYear must be YYYY-MM format' }, 400)
  }
})

app.post('/api/cron/roulette', async (c) => {
  const cronSecret = c.env.CRON_SECRET
  if (cronSecret) {
    const incoming = c.req.header('x-cron-secret')
    if (incoming !== cronSecret) {
      return c.json({ error: 'unauthorized' }, 401)
    }
  }

  const targetMonthYear = toMonthYear()
  try {
    const result = await runRouletteJob(c.env, targetMonthYear)
    return c.json({ result })
  } catch {
    return c.json({ error: 'cron run failed' }, 500)
  }
})

export default {
  fetch: app.fetch,
  scheduled: (event: { scheduledTime: number }, env: D1Bindings, ctx: { waitUntil: (promise: Promise<unknown>) => void }) => {
    const targetMonthYear = toMonthYear(new Date(event.scheduledTime))
    ctx.waitUntil(runRouletteJob(env, targetMonthYear))
  },
}
