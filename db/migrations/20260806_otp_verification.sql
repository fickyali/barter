alter table users add column if not exists email_verified_at timestamptz;

create table if not exists otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  method text not null,
  target text not null,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists otps_user_method_target_idx
on otps (user_id, method, target);
