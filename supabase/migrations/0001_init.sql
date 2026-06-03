-- Sticker Swap — schema
create table if not exists stickers (
  id            text primary key,
  section_code  text not null,
  section_name  text not null,
  section_order int  not null,
  num_in_section int not null,
  label         text not null,
  type          text not null
);

create table if not exists groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text unique not null,
  created_at  timestamptz default now()
);

create table if not exists profiles (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(id) on delete cascade,
  username    text not null,
  owner_token text not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (group_id, username)
);

-- a row exists only when you HAVE the sticker. count = 1 + spares (so count 1 = got, 2 = one double, ...)
create table if not exists holdings (
  profile_id   uuid not null references profiles(id) on delete cascade,
  sticker_id   text not null references stickers(id),
  count        int  not null default 1 check (count >= 1),
  reserved_for uuid references profiles(id),
  primary key (profile_id, sticker_id)
);

create table if not exists requests (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references groups(id) on delete cascade,
  from_profile uuid not null references profiles(id) on delete cascade,
  to_profile   uuid not null references profiles(id) on delete cascade,
  offered      text[] not null default '{}',
  wanted       text[] not null default '{}',
  status       text not null default 'open',  -- open | accepted | declined | done
  created_at   timestamptz default now()
);

create index if not exists holdings_profile_idx on holdings(profile_id);
create index if not exists requests_to_idx on requests(to_profile);
create index if not exists requests_from_idx on requests(from_profile);
