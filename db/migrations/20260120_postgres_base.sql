create extension if not exists pgcrypto;

do $$ begin
  create type item_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references users(id) on delete cascade,
  email text unique not null,
  name text,
  whatsapp text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  condition text not null,
  wanted_item text,
  barter_price bigint,
  image_url text,
  status item_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sessions_expires_at_idx on sessions (expires_at);
create index if not exists items_status_created_at_idx on items (status, created_at desc);
create index if not exists items_user_id_created_at_idx on items (user_id, created_at desc);
