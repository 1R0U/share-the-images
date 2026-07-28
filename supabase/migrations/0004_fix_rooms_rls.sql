-- Allow room owners to read a room they just created, before the
-- corresponding room_members row exists (rooms_read requires membership).
create policy "rooms_read_by_owner" on rooms for select
  using (auth.uid() = owner_id);
