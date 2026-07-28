-- Harden create_room: require authentication, reject blank names, and
-- ensure the SECURITY DEFINER function isn't callable via the default
-- PUBLIC execute grant that PostgreSQL applies to new functions.
create or replace function create_room(room_name text, room_description text default null)
returns rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  new_room rooms;
  trimmed_name text := btrim(room_name);
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if trimmed_name is null or length(trimmed_name) = 0 then
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
