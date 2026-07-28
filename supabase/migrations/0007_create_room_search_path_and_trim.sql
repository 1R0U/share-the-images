-- Two follow-up hardenings for create_room:
-- 1. search_path must end with pg_temp so a caller-created temp table/view
--    cannot shadow the unqualified `rooms` / `room_members` references.
-- 2. trimmed_name must strip the full whitespace class, not just spaces
--    (btrim() only strips literal spaces), so stored names don't retain
--    leading/trailing tabs or newlines that slipped past the blank check.
create or replace function create_room(room_name text, room_description text default null)
returns rooms
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_room rooms;
  trimmed_name text := regexp_replace(room_name, '^[[:space:]]+|[[:space:]]+$', '', 'g');
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if room_name is null or room_name !~ '[^[:space:]]' then
    raise exception 'room_name must not be blank';
  end if;

  insert into rooms (name, description, owner_id)
  values (trimmed_name, room_description, auth.uid())
  returning * into new_room;

  insert into room_members (room_id, user_id, role)
  values (new_room.id, auth.uid(), 'owner');

  return new_room;
end;
$$;

revoke all on function create_room(text, text) from public;
grant execute on function create_room(text, text) to authenticated;
