create extension if not exists pgcrypto;

create table if not exists public.hero_meta_snapshots (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'rivalsmeta',
  snapshot_date date not null,
  captured_at timestamptz not null default now(),
  season text not null,
  rank_filter text not null,
  hero text not null,
  meta_tier text not null,
  win_rate numeric(5,2) not null,
  meta_score numeric(5,2) not null,
  pick_rate numeric(5,2),
  ban_rate numeric(5,2),
  matches integer,
  source_url text not null,
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (source, snapshot_date, season, rank_filter, hero)
);

create index if not exists idx_hero_meta_snapshots_hero
on public.hero_meta_snapshots (hero);

create index if not exists idx_hero_meta_snapshots_rank_hero_date
on public.hero_meta_snapshots (rank_filter, hero, snapshot_date);

create index if not exists idx_hero_meta_snapshots_season_rank_date
on public.hero_meta_snapshots (season, rank_filter, snapshot_date);

alter table public.hero_meta_snapshots enable row level security;
