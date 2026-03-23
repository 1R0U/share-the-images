import { sql } from 'kysely'
import type { Kysely } from 'kysely'
import type {
  Database,
  MemberRole,
  MediaType,
  NewCommunity,
  NewMedia,
  NewMember,
  NewReaction,
} from './types'

export const createCommunity = async (db: Kysely<Database>, input: NewCommunity) => {
  await db.insertInto('communities').values(input).execute()

  return db
    .selectFrom('communities')
    .selectAll()
    .where('id', '=', input.id)
    .executeTakeFirst()
}

export const listUserCommunities = async (db: Kysely<Database>, userId: string) => {
  return db
    .selectFrom('members')
    .innerJoin('communities', 'communities.id', 'members.community_id')
    .select([
      'communities.id as id',
      'communities.name as name',
      'members.role as role',
      'communities.created_at as created_at',
    ])
    .where('members.user_id', '=', userId)
    .orderBy('communities.created_at desc')
    .execute()
}

export const addMemberToCommunity = async (db: Kysely<Database>, input: NewMember) => {
  await db
    .insertInto('members')
    .values(input)
    .onConflict((oc) => oc.columns(['user_id', 'community_id']).doNothing())
    .execute()

  return db
    .selectFrom('members')
    .selectAll()
    .where('user_id', '=', input.user_id)
    .where('community_id', '=', input.community_id)
    .executeTakeFirst()
}

export const isValidMemberRole = (role: string): role is MemberRole => {
  return role === 'owner' || role === 'admin' || role === 'member'
}

export const isValidMediaType = (type: string): type is MediaType => {
  return type === 'image' || type === 'video'
}

const toMonthRange = (month: string) => {
  const [year, monthNum] = month.split('-').map(Number)

  if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
    throw new Error('month must be YYYY-MM format')
  }

  const start = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(year, monthNum, 1, 0, 0, 0, 0))

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

export const getMonthRange = (month: string) => {
  return toMonthRange(month)
}

export const createMedia = async (db: Kysely<Database>, input: NewMedia) => {
  await db.insertInto('media').values(input).execute()

  return db.selectFrom('media').selectAll().where('id', '=', input.id).executeTakeFirst()
}

export const listMediaByCommunityAndMonth = async (
  db: Kysely<Database>,
  communityId: string,
  month: string,
) => {
  const { start, end } = toMonthRange(month)

  return db
    .selectFrom('media')
    .selectAll()
    .where('community_id', '=', communityId)
    .where('created_at', '>=', start)
    .where('created_at', '<', end)
    .orderBy('created_at desc')
    .execute()
}

export const getMonthlyMediaStats = async (
  db: Kysely<Database>,
  communityId: string,
  month: string,
) => {
  const { start, end } = toMonthRange(month)

  const imageCount = await db
    .selectFrom('media')
    .select((eb) => eb.fn.count('id').as('count'))
    .where('community_id', '=', communityId)
    .where('type', '=', 'image')
    .where('created_at', '>=', start)
    .where('created_at', '<', end)
    .executeTakeFirst()

  const videoDuration = await db
    .selectFrom('media')
    .select((eb) => eb.fn.coalesce(eb.fn.sum<number>('duration_seconds'), sql<number>`0`).as('sum'))
    .where('community_id', '=', communityId)
    .where('type', '=', 'video')
    .where('created_at', '>=', start)
    .where('created_at', '<', end)
    .executeTakeFirst()

  return {
    imageCount: Number(imageCount?.count ?? 0),
    videoDurationSeconds: Number(videoDuration?.sum ?? 0),
  }
}

export const pickRandomMediaForRoulette = async (
  db: Kysely<Database>,
  communityId: string,
) => {
  return db
    .selectFrom('media')
    .selectAll()
    .where('community_id', '=', communityId)
    .orderBy(sql`RANDOM()`)
    .limit(1)
    .executeTakeFirst()
}

export const pickRandomPastMediaForRoulette = async (
  db: Kysely<Database>,
  communityId: string,
  beforeIso: string,
) => {
  return db
    .selectFrom('media')
    .selectAll()
    .where('community_id', '=', communityId)
    .where('created_at', '<', beforeIso)
    .orderBy(sql`RANDOM()`)
    .limit(1)
    .executeTakeFirst()
}

export const listCommunityIds = async (db: Kysely<Database>) => {
  return db.selectFrom('communities').select('id').execute()
}

export const createRouletteHistory = async (
  db: Kysely<Database>,
  input: { id: string; community_id: string; media_id: string; target_month_year: string },
) => {
  await db
    .insertInto('roulette_history')
    .values(input)
    .onConflict((oc) => oc.columns(['community_id', 'target_month_year']).doNothing())
    .execute()

  return db
    .selectFrom('roulette_history')
    .selectAll()
    .where('community_id', '=', input.community_id)
    .where('target_month_year', '=', input.target_month_year)
    .executeTakeFirst()
}

export const getRouletteShot = async (
  db: Kysely<Database>,
  communityId: string,
  targetMonthYear: string,
) => {
  return db
    .selectFrom('roulette_history')
    .innerJoin('media', 'media.id', 'roulette_history.media_id')
    .leftJoin('users', 'users.id', 'media.user_id')
    .select([
      'roulette_history.id as roulette_id',
      'roulette_history.target_month_year as target_month_year',
      'media.id as media_id',
      'media.type as media_type',
      'media.r2_url as media_url',
      'media.created_at as media_created_at',
      'users.name as user_name',
    ])
    .where('roulette_history.community_id', '=', communityId)
    .where('roulette_history.target_month_year', '=', targetMonthYear)
    .executeTakeFirst()
}

export const createReaction = async (db: Kysely<Database>, input: NewReaction) => {
  await db.insertInto('reactions').values(input).execute()

  return db.selectFrom('reactions').selectAll().where('id', '=', input.id).executeTakeFirst()
}

export const listReactionsByMediaIds = async (db: Kysely<Database>, mediaIds: string[]) => {
  if (mediaIds.length === 0) return []

  return db
    .selectFrom('reactions')
    .leftJoin('users', 'users.id', 'reactions.user_id')
    .select([
      'reactions.id as id',
      'reactions.media_id as media_id',
      'reactions.user_id as user_id',
      'reactions.emoji_type as emoji_type',
      'reactions.comment_text as comment_text',
      'reactions.created_at as created_at',
      'users.name as user_name',
    ])
    .where('reactions.media_id', 'in', mediaIds)
    .orderBy('reactions.created_at asc')
    .execute()
}
