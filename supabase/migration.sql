create table cards (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  source_url text not null,
  platform text not null check (platform in ('instagram', 'tiktok')),
  city text not null default 'sf',
  vibe text not null,
  stops jsonb not null,
  map_url text,
  created_at timestamptz not null default now()
);

create index cards_slug_idx on cards(slug);
create index cards_created_at_idx on cards(created_at desc);
