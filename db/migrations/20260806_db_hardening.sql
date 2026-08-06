create extension if not exists citext;

alter table users alter column email type citext;
alter table profiles alter column email type citext;

alter table sessions add column if not exists token_lookup_hash text;

create unique index if not exists sessions_token_lookup_hash_unique
on sessions (token_lookup_hash)
where token_lookup_hash is not null;

create index if not exists sessions_user_id_idx on sessions (user_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_set_updated_at on users;
create trigger users_set_updated_at
before update on users
for each row execute function set_updated_at();

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
before update on profiles
for each row execute function set_updated_at();

drop trigger if exists items_set_updated_at on items;
create trigger items_set_updated_at
before update on items
for each row execute function set_updated_at();

alter table items drop constraint if exists items_title_length_check;
alter table items add constraint items_title_length_check check (length(trim(title)) between 1 and 120);

alter table items drop constraint if exists items_description_length_check;
alter table items add constraint items_description_length_check check (length(trim(description)) between 1 and 5000);

alter table items drop constraint if exists items_category_length_check;
alter table items add constraint items_category_length_check check (length(trim(category)) between 1 and 80);

alter table items drop constraint if exists items_condition_length_check;
alter table items add constraint items_condition_length_check check (length(trim(condition)) between 1 and 80);

alter table items drop constraint if exists items_barter_price_nonnegative_check;
alter table items add constraint items_barter_price_nonnegative_check check (barter_price is null or barter_price >= 0);

alter table items drop constraint if exists items_image_url_check;
alter table items add constraint items_image_url_check check (
  image_url is null
  or image_url ~ '^https://[^[:space:]]+$'
);

drop index if exists items_slug_unique;
create unique index if not exists items_slug_unique
on items (slug)
where slug is not null;
