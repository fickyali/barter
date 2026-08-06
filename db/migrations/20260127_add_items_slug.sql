-- Add slug to items for human-friendly URLs
-- Safe to run multiple times

alter table public.items
add column if not exists slug text;

create unique index if not exists items_slug_unique
on public.items (slug);

-- Backfill existing rows: slug = slugified(title) + '-' + first 8 chars of id
update public.items
set slug = (
  case
    when coalesce(trim(title), '') = '' then 'item'
    else trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g'))
  end
) || '-' || substr(id::text, 1, 8)
where slug is null;
