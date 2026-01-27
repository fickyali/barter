# Setup Supabase — Barter MVP

Tujuan: memastikan local app di [apps/web](apps/web) benar-benar terhubung ke Supabase (Auth + DB + Storage) sesuai skema.

## 1) Pastikan SQL schema sudah dijalankan
Di Supabase Dashboard:
- SQL Editor → jalankan script schema + RLS + trigger yang kamu punya.

### (Opsional tapi direkomendasikan) Tambah kolom `slug` untuk URL yang enak dibaca
App sekarang memakai URL `/items/[key]` di mana `key` bisa berupa `slug` (contoh: `iphone-12-8f3a1c2d`) atau UUID.

Jalankan SQL ini di Supabase (SQL Editor):

```sql
alter table public.items
add column if not exists slug text;

create unique index if not exists items_slug_unique
on public.items (slug);

-- Backfill untuk data lama (buat slug yang unik dari title + prefix id)
update public.items
set slug = (
  case
    when coalesce(trim(title), '') = '' then 'item'
    else trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g'))
  end
) || '-' || substr(id::text, 1, 8)
where slug is null;
```

Catatan:
- Setelah migration ini, item baru akan otomatis di-insert dengan slug dari app.
- Slug dibuat unik via suffix random/id-prefix, jadi aman walau judul sama.

Checklist verifikasi:
- Table `profiles` ada
- Table `items` ada
- RLS ON untuk dua table
- Policies terpasang
- Trigger `on_auth_user_created` aktif dan mengarah ke `public.handle_new_user()`
- Trigger `update_profiles_updated_at` dan `update_items_updated_at` aktif

## 2) Pastikan Storage bucket ada
Di Supabase Dashboard:
- Storage → bucket `item-images`
- Bucket `public = true`
- Policies untuk select/insert/update/delete sesuai script

## 3) Buat admin user
- Buat user biasa (atau pakai user existing)
- Set jadi admin:
  - Table Editor → `profiles` → cari row user → set `is_admin = true`

## 4) Konfigurasi env di local app
File env ada di:
- `apps/web/.env.local`

Harus ada:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Catatan:
- `.env.local` sudah di-ignore oleh `.gitignore` (aman untuk local).

## 5) Jalankan app
- `cd apps/web`
- `npm install`
- `npm run dev -p 3000`

Buka:
- http://localhost:3000/login

## 6) Smoke test end-to-end
1) Login dengan user existing
2) Buka Profile → isi WhatsApp → Save
3) Tambah item (opsional upload foto)
4) Cek item muncul di “Item Saya” dengan status `pending`
5) Login sebagai admin → `/admin` → approve item
6) Kembali ke Home → item muncul di daftar publik (approved)
7) Buka detail item → tombol WhatsApp muncul

## 7) Troubleshooting cepat
- Error `Invalid login credentials`: pastikan email/password benar, dan user sudah confirmed jika email confirmation ON.
- Error RLS saat insert/update: pastikan user login dan policy sesuai; cek `user_id` insert memakai `auth.uid()`.
- Gambar tidak tampil: pastikan bucket `public`, URL domain sudah di-allow di `apps/web/next.config.ts`.
