-- Atomically validate an invite code and join the room.
--
-- Two correctness issues with doing this client-side (select validity ->
-- insert membership -> increment use_count as separate requests):
-- 1. TOCTOU race: two concurrent joins against the same near-limit invite
--    can both read use_count < max_uses before either increments it,
--    letting the invite be used more than max_uses times.
-- 2. `upsert` into room_members on (room_id, user_id) conflict overwrites
--    the existing row's `role`, silently demoting an owner who re-uses
--    their own invite link down to 'member'.
--
-- `select ... for update` row-locks the invite so concurrent joins
-- serialize, and `on conflict do nothing` leaves an existing membership
-- (and its role) untouched.
create or replace function join_room_by_code(invite_code text)
returns rooms
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_invite room_invites;
  joined_room rooms;
  inserted_count int;
begin
  if auth.uid() is null then
    raise exception '認証が必要です';
  end if;

  if invite_code is null or invite_code !~ '[^[:space:]]' then
    raise exception '招待コードを入力してください';
  end if;

  select * into target_invite
  from room_invites
  where code = upper(regexp_replace(invite_code, '^[[:space:]]+|[[:space:]]+$', '', 'g'))
  for update;

  if not found then
    raise exception '無効な招待コードです';
  end if;

  -- Already a member: return the room as-is without re-validating
  -- expiry/max_uses, since no new slot is being consumed.
  if exists (
    select 1 from room_members
    where room_id = target_invite.room_id and user_id = auth.uid()
  ) then
    select * into joined_room from rooms where id = target_invite.room_id;
    return joined_room;
  end if;

  if target_invite.expires_at is not null and target_invite.expires_at < now() then
    raise exception 'この招待リンクは期限切れです';
  end if;

  if target_invite.max_uses is not null and target_invite.use_count >= target_invite.max_uses then
    raise exception 'このリンクは上限に達しました';
  end if;

  with ins as (
    insert into room_members (room_id, user_id, role)
    values (target_invite.room_id, auth.uid(), 'member')
    on conflict (room_id, user_id) do nothing
    returning 1
  )
  select count(*) into inserted_count from ins;

  if inserted_count > 0 then
    update room_invites set use_count = use_count + 1 where id = target_invite.id;
  end if;

  select * into joined_room from rooms where id = target_invite.room_id;

  return joined_room;
end;
$$;

revoke all on function join_room_by_code(text) from public;
grant execute on function join_room_by_code(text) to authenticated;
