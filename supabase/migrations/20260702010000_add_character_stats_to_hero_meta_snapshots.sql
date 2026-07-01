alter table public.hero_meta_snapshots
add column if not exists pick_rate numeric(5,2),
add column if not exists ban_rate numeric(5,2),
add column if not exists matches integer,
add column if not exists role text,
add column if not exists characters_source_url text,
add column if not exists characters_scope text;
