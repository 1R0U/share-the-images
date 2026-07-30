-- Enable Supabase Realtime postgres_changes broadcasts for the media table
-- so the timeline can subscribe to INSERT events (new posts).
alter publication supabase_realtime add table media;
