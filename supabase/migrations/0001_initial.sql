-- Enable extensions
create extension if not exists "pg_trgm";
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Rooms
create table rooms (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  cover_url text,
  owner_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now() not null
);

-- Room members
create table room_members (
  room_id uuid references rooms(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz default now() not null,
  primary key (room_id, user_id)
);

-- Room invites
create table room_invites (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id) on delete cascade,
  code text not null unique default upper(substring(replace(uuid_generate_v4()::text, '-', ''), 1, 8)),
  password_hash text,
  expires_at timestamptz,
  max_uses integer,
  use_count integer not null default 0,
  created_by uuid not null references profiles(id),
  created_at timestamptz default now() not null
);

-- Media
create table media (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id) on delete cascade,
  uploader_id uuid not null references profiles(id) on delete set null,
  r2_key text not null unique,
  r2_url text not null,
  media_type text not null check (media_type in ('photo', 'video')),
  width integer,
  height integer,
  duration_sec numeric,
  taken_at timestamptz,
  uploaded_at timestamptz default now() not null,
  ai_processed boolean default false not null
);

create index media_room_uploaded on media(room_id, uploaded_at desc);
create index media_taken_at on media(room_id, taken_at desc) where taken_at is not null;

-- Tags
create table tags (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz default now() not null
);

create index tags_name_trgm on tags using gin (name gin_trgm_ops);

-- Media tags
create table media_tags (
  media_id uuid references media(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  source text not null check (source in ('manual', 'ai')),
  confidence numeric check (confidence between 0 and 1),
  primary key (media_id, tag_id)
);

-- Reactions
create table reactions (
  id uuid primary key default uuid_generate_v4(),
  media_id uuid not null references media(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now() not null,
  unique (media_id, user_id, emoji)
);

-- Comments
create table comments (
  id uuid primary key default uuid_generate_v4(),
  media_id uuid not null references media(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz default now() not null
);

create index comments_media on comments(media_id, created_at);

-- Memory history
create table memory_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  media_id uuid not null references media(id) on delete cascade,
  shown_at timestamptz default now() not null
);

-- Row-level security
alter table profiles enable row level security;
alter table rooms enable row level security;
alter table room_members enable row level security;
alter table room_invites enable row level security;
alter table media enable row level security;
alter table tags enable row level security;
alter table media_tags enable row level security;
alter table reactions enable row level security;
alter table comments enable row level security;
alter table memory_history enable row level security;

-- Profiles: users can read all, update own
create policy "profiles_read" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Rooms: readable by members
create policy "rooms_read" on rooms for select
  using (exists (select 1 from room_members where room_id = rooms.id and user_id = auth.uid()));
create policy "rooms_insert" on rooms for insert with check (auth.uid() = owner_id);
create policy "rooms_update" on rooms for update
  using (auth.uid() = owner_id);

-- Room members
create policy "room_members_read" on room_members for select
  using (exists (select 1 from room_members m where m.room_id = room_members.room_id and m.user_id = auth.uid()));
create policy "room_members_insert" on room_members for insert
  with check (auth.uid() = user_id);

-- Room invites
create policy "room_invites_read" on room_invites for select using (true);
create policy "room_invites_insert" on room_invites for insert
  with check (exists (select 1 from room_members where room_id = room_invites.room_id and user_id = auth.uid()));

-- Media: room members only
create policy "media_read" on media for select
  using (exists (select 1 from room_members where room_id = media.room_id and user_id = auth.uid()));
create policy "media_insert" on media for insert
  with check (exists (select 1 from room_members where room_id = media.room_id and user_id = auth.uid()));

-- Tags: readable by all authenticated
create policy "tags_read" on tags for select using (auth.uid() is not null);
create policy "tags_insert" on tags for insert with check (auth.uid() is not null);

-- Media tags
create policy "media_tags_read" on media_tags for select
  using (exists (select 1 from media m join room_members rm on rm.room_id = m.room_id where m.id = media_tags.media_id and rm.user_id = auth.uid()));
create policy "media_tags_insert" on media_tags for insert with check (auth.uid() is not null);

-- Reactions & comments: room members
create policy "reactions_read" on reactions for select
  using (exists (select 1 from media m join room_members rm on rm.room_id = m.room_id where m.id = reactions.media_id and rm.user_id = auth.uid()));
create policy "reactions_insert" on reactions for insert
  with check (auth.uid() = user_id);

create policy "comments_read" on comments for select
  using (exists (select 1 from media m join room_members rm on rm.room_id = m.room_id where m.id = comments.media_id and rm.user_id = auth.uid()));
create policy "comments_insert" on comments for insert
  with check (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
