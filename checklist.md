# Checklist Implementasi — Barter App (Sederhana)

Tanggal: 2026-01-27

## 0) Keputusan Cepat (sebelum ngoding)
- [x] Format `profiles.whatsapp` diputuskan (dipakai di app: normalize digits, `08xx` → `62xx`, contoh: `62812xxxx`)
- [x] Akses Home: public (tanpa login), hanya tampil item `approved`
- [x] Aturan edit item approved: reset status ke `pending` (pakai rekomendasi)

## 1) Setup Supabase
- [x] Project Supabase sudah ada
- [x] Jalankan SQL schema + RLS + trigger (pastikan sudah di-run persis seperti script)
- [x] Jalankan migration `slug` untuk table `items` (lihat `SUPABASE_SETUP.md` atau `supabase/migrations/20260127_add_items_slug.sql`)
- [x] Pastikan Storage bucket `item-images` ada (public read)
- [x] Pastikan policy storage aktif dan benar (insert/update/delete sesuai folder user)
- [x] Set 1 user admin (set `profiles.is_admin = true` via SQL / dashboard)

## 2) Setup Frontend (minimal)
- [x] Pilih stack: Next.js + Tailwind (App Router) di `apps/web`
- [x] Install Supabase client SDK (`@supabase/supabase-js`)
- [x] Buat env var: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (terpasang di `apps/web/.env.local`)
- [x] Inisialisasi `supabaseClient` (single instance)
- [x] Allow remote image Supabase Storage di Next config

## 3) Auth (Login/Logout)
- [x] Halaman Login (`/login`)
- [x] Login flow email/password
- [x] Session persistence (auto-restore via `getSession` + `onAuthStateChange`)
- [x] Guard route: Profile/Admin butuh session (Home public)
- [x] Tombol Logout

### Register
- [x] Halaman Register (`/register`)
- [x] Register flow email/password (Supabase `signUp`)
- [x] Jika email confirmation ON: tampilkan instruksi cek email
- [ ] Setelah signup, pastikan row `profiles` terbuat oleh trigger (verifikasi di Supabase / status cek otomatis di `/register`)

## 4) Profile Page
- [x] Fetch `profiles` current user by `auth.uid()`
- [x] Form edit: `name`, `whatsapp`
- [x] Validasi nomor WhatsApp (digits only, panjang 10–15, normalize)
- [x] Save → update row `profiles`
- [x] State: loading, success, error

## 5) Home Page (public)
- [x] Query list `items` (default: `status = 'approved'`)
- [x] Home bisa diakses tanpa login (public list approved)
- [x] Render card list (title, category, condition, wanted_item/barter_price + badge status)
- [x] Thumbnail foto tampil di card listing
- [ ] Paging sederhana (limit + next)
- [x] Empty state (belum ada item)
- [x] Link/aksi ke Item Detail
- [x] Section “Item Saya” (query by `user_id`)

## 6) Item Detail
- [x] Tampilkan detail lengkap item
- [x] Item detail bisa diakses tanpa login (public)
- [x] Fetch profile pemilik item (query `profiles` by `items.user_id`)
- [x] Tombol WhatsApp:
  - [x] Jika nomor ada → buka `https://wa.me/<phone>`
  - [x] Jika kosong → disabled + hint
- [x] Error/Not found state

## 6.1) Slug URL Item
- [x] Routing item pakai `/items/[key]` (key bisa slug atau UUID)
- [x] Item baru otomatis dibuatkan slug dan redirect ke URL slug
- [x] Slug tanpa angka; angka hanya dipakai untuk collision (contoh: `kamera`, `kamera-2`, `kamera-3`)
- [ ] (Opsional) Canonical redirect: kalau buka UUID, auto-redirect ke slug

## 7) Create Item
- [x] Form create dengan field required:
  - [x] `title`
  - [x] `description`
  - [x] `category`
  - [x] `condition`
- [x] Field optional:
  - [x] `wanted_item`
  - [x] `barter_price`
  - [x] Image upload (optional)
- [x] Submit insert `items` dengan `user_id = auth.uid()`
- [x] Status default `pending` (oleh DB default)
- [x] Success state → redirect ke Item Detail

## 8) Upload Gambar (Supabase Storage)
- [x] Implement kompresi/resize (client-side) + limit max 1MB (JPG/PNG)
- [x] Upload file ke bucket `item-images` pada folder `<auth.uid()>/...`
- [x] Dapatkan public URL dan simpan ke `items.image_url`
- [x] Error handling: upload gagal → tampilkan error (item tidak tersimpan jika upload gagal)
  - [ ] Opsional: ubah jadi “upload gagal → item tetap tersimpan tanpa gambar”

## 9) Edit & Delete Item (Owner)
- [x] Owner bisa edit item miliknya
- [x] Jika aturan “edit approved → pending” dipilih:
  - [x] Implement set `status='pending'` saat update
- [x] Owner/admin bisa delete item (tombol delete di Item Detail)
- [x] UI: tombol edit hanya muncul untuk owner

## 10) Admin Dashboard
- [x] Proteksi akses: hanya `profiles.is_admin = true` (non-admin redirect ke Home)
- [x] List item by status:
  - [x] Tab `pending` (default)
  - [x] Tab `approved`
  - [x] Tab `rejected`
- [x] Approve action → update `items.status='approved'`
- [x] Reject action → update `items.status='rejected'`
- [ ] Detail panel (foto + owner email) — belum (saat ini hanya desc)
- [x] Unauthorized state untuk non-admin: redirect ke Home

## 11) UX States (Wajib Minimal)
- [x] Loading state per page
- [x] Error message per page (basic)
- [x] Empty states (basic)

## 12) Quality / Acceptance Checklist (ringkas)
- [ ] User signup membuat row `profiles` otomatis (verifikasi di Supabase / status cek otomatis di `/register`)
- [x] Item baru selalu `pending`
- [x] Publik hanya bisa melihat item `approved` (verifikasi RLS)
- [x] Owner bisa melihat pending/rejected miliknya (lewat “Item Saya”)
- [x] Non-admin tidak bisa akses Admin Dashboard (hard redirect)
- [x] Tombol WhatsApp valid & tidak muncul jika nomor kosong

## 13) Release Checklist
- [ ] Env vars terpasang di hosting
- [ ] Pastikan RLS ON di `profiles` dan `items`
- [ ] Pastikan bucket `item-images` public read
- [ ] Smoke test: login → create item → admin approve → item tampil di Home → tombol WA jalan

---

## Status MVP (yang sudah jadi)
- [x] MVP web: `apps/web`
- [x] `npm run lint` lolos
- [x] `npm run build` lolos
- [x] Route siap dicoba: `/login`, `/`, `/profile`, `/items/new`, `/items/[key]`, `/admin`
