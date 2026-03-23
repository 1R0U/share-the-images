import type { ColumnType, Insertable, Selectable, Updateable } from 'kysely'

export type Timestamp = ColumnType<string, string | undefined, string | undefined>

export interface UsersTable {
  id: string
  name: string | null
  email: string
  email_verified: number
  image: string | null
  created_at: Timestamp
  updated_at: Timestamp
}

export interface SessionsTable {
  id: string
  user_id: string
  token: string
  expires_at: string
  ip_address: string | null
  user_agent: string | null
  created_at: Timestamp
  updated_at: Timestamp
}

export interface AccountsTable {
  id: string
  user_id: string
  provider_id: string
  account_id: string
  access_token: string | null
  refresh_token: string | null
  id_token: string | null
  access_token_expires_at: string | null
  refresh_token_expires_at: string | null
  scope: string | null
  password: string | null
  created_at: Timestamp
  updated_at: Timestamp
}

export interface VerificationsTable {
  id: string
  identifier: string
  value: string
  expires_at: string
  created_at: Timestamp
  updated_at: Timestamp
}

export interface CommunitiesTable {
  id: string
  name: string
  created_at: Timestamp
}

export type MemberRole = 'owner' | 'admin' | 'member'

export interface MembersTable {
  user_id: string
  community_id: string
  role: MemberRole
  created_at: Timestamp
}

export type MediaType = 'image' | 'video'

export interface MediaTable {
  id: string
  community_id: string
  user_id: string
  type: MediaType
  r2_key: string
  r2_url: string
  duration_seconds: number | null
  created_at: Timestamp
}

export interface ReactionsTable {
  id: string
  media_id: string
  user_id: string
  emoji_type: string | null
  comment_text: string | null
  created_at: Timestamp
}

export interface RouletteHistoryTable {
  id: string
  community_id: string
  media_id: string
  target_month_year: string
  created_at: Timestamp
}

export interface Database {
  users: UsersTable
  sessions: SessionsTable
  accounts: AccountsTable
  verifications: VerificationsTable
  communities: CommunitiesTable
  members: MembersTable
  media: MediaTable
  reactions: ReactionsTable
  roulette_history: RouletteHistoryTable
}

export type User = Selectable<UsersTable>
export type NewUser = Insertable<UsersTable>
export type UserUpdate = Updateable<UsersTable>

export type Community = Selectable<CommunitiesTable>
export type NewCommunity = Insertable<CommunitiesTable>
export type CommunityUpdate = Updateable<CommunitiesTable>

export type Media = Selectable<MediaTable>
export type NewMedia = Insertable<MediaTable>
export type MediaUpdate = Updateable<MediaTable>

export type Reaction = Selectable<ReactionsTable>
export type NewReaction = Insertable<ReactionsTable>
export type ReactionUpdate = Updateable<ReactionsTable>

export type RouletteHistory = Selectable<RouletteHistoryTable>
export type NewRouletteHistory = Insertable<RouletteHistoryTable>

export type Session = Selectable<SessionsTable>
export type Account = Selectable<AccountsTable>
export type Verification = Selectable<VerificationsTable>

export type Member = Selectable<MembersTable>
export type NewMember = Insertable<MembersTable>
export type MemberUpdate = Updateable<MembersTable>
