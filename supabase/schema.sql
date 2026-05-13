-- SquadCards schema
-- Paste this into the Supabase SQL Editor and click Run

create table if not exists cards (
  id           uuid primary key default gen_random_uuid(),
  device_id    text not null,
  name         text not null default 'Unknown',
  type         text not null default '',
  rarity       text not null default 'common',
  flavor       text not null default '',
  photo_url    text,
  stats        jsonb not null default '[]'::jsonb,
  created_at   timestamptz default now()
);

create table if not exists packs (
  id           uuid primary key default gen_random_uuid(),
  device_id    text not null,
  name         text not null default 'Mystery Pack',
  card_ids     uuid[] not null default '{}',
  created_at   timestamptz default now()
);

create index if not exists cards_device_idx on cards (device_id);
create index if not exists packs_device_idx on packs (device_id);

-- Row Level Security (permissive — no login needed for demo)
alter table cards enable row level security;
alter table packs enable row level security;

create policy "public read cards"   on cards for select using (true);
create policy "public insert cards" on cards for insert with check (true);
create policy "public delete cards" on cards for delete using (true);

create policy "public read packs"   on packs for select using (true);
create policy "public insert packs" on packs for insert with check (true);
