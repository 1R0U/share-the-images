-- Atomically create a room and its owner membership row.
-- Prevents a room existing without its owner as a member when the
-- room_members insert would otherwise fail independently of the rooms insert.
create or replace function create_room(room_name text, room_description text default null)
returns rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  new_room rooms;
begin
  insert into rooms (name, description, owner_id)
  values (room_name, room_description, auth.uid())
  returning * into new_room;

  insert into room_members (room_id, user_id, role)
  values (new_room.id, auth.uid(), 'owner');

  return new_room;
end;
$$;

grant execute on function create_room(text, text) to authenticated;
