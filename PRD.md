# PRD — Aplikasi Barter Sederhana

Tanggal: 2026-01-27  
Versi: 1.0 (Sederhana)

## 1) Ringkasan
Aplikasi ini memungkinkan user login, membuat listing barang untuk barter, melihat listing yang sudah disetujui (approved), serta menghubungi pemilik barang via tombol WhatsApp. Admin memiliki dashboard untuk memoderasi (approve/reject) listing.

Back-end diasumsikan memakai Supabase (Auth, Postgres + RLS, Storage) sesuai skema SQL yang diberikan.

## 2) Tujuan
- User dapat membuat listing barang untuk barter (dengan foto opsional).
- User dapat melihat daftar listing yang sudah **approved** setelah login.
- User dapat mengatur profil (nama & nomor WhatsApp) sehingga muncul tombol WhatsApp pada listing.
- Admin dapat meninjau listing (status `pending`) lalu **approve / reject**.

## 3) Non-Goals (di luar scope v1)
- Chat in-app (selain redirect WhatsApp).
- Pembayaran / escrow.
- Multi-foto per item.
- Fitur pencarian advanced, rekomendasi, lokasi, rating.
- Notifikasi push/email otomatis (bisa jadi v2).

## 4) Definisi & Istilah
- **User**: pengguna biasa.
- **Admin**: user dengan `profiles.is_admin = true`.
- **Item**: listing barter.
- **Status item**:
  - `pending`: baru dibuat, menunggu review admin.
  - `approved`: tampil publik (dan tampil di Home user).
  - `rejected`: tidak tampil publik.

## 5) Persona
1) **User Barter**
- Ingin mem-posting barang dan cepat dihubungi via WhatsApp.
- Ingin browsing barang yang tersedia untuk barter.

2) **Admin Moderator**
- Ingin memfilter konten spam/ilegal dan memastikan listing layak tayang.
- Ingin proses approve/reject cepat.

## 6) Data Model (mengacu skema)
### 6.1 `profiles`
- `id` (UUID): sama dengan `auth.users.id`.
- `email` (unique, not null)
- `name` (nullable)
- `whatsapp` (nullable) — nomor untuk tombol WhatsApp.
- `is_admin` (bool)
- `created_at`, `updated_at`

Catatan: profile otomatis dibuat saat signup lewat trigger `handle_new_user()`.

### 6.2 `items`
- `id` UUID
- `user_id` (FK ke auth.users)
- `title`, `description`, `category`, `condition` (required)
- `wanted_item` (optional)
- `barter_price` (optional) — teks, mis. “tambah 50rb” / “nego”.
- `image_url` (optional)
- `status` (`pending|approved|rejected`)
- timestamps

## 7) Permission & Security (RLS sesuai SQL)
RLS yang diberikan menjadi sumber kebenaran.

### 7.1 Akses `profiles`
- Siapa pun bisa SELECT profil.
- User hanya bisa INSERT/UPDATE profil miliknya (`auth.uid() = id`).

### 7.2 Akses `items`
- SELECT: semua orang bisa lihat `approved`; pemilik bisa lihat miliknya; admin bisa lihat semua.
- INSERT: hanya user terautentikasi dan `auth.uid() = user_id`.
- UPDATE/DELETE: pemilik atau admin.

### 7.3 Storage `item-images`
- Public read.
- Authenticated bisa upload.
- Update/delete hanya untuk owner folder sesuai `auth.uid()`.

## 8) User Experience & Informasi Arsitektur Halaman
Aplikasi minimal memiliki 3 halaman utama sesuai request:
1) **Home (setelah login)** — daftar listing
2) **Profile** — data user + WhatsApp
3) **Admin Dashboard** — approval listing

Tambahan yang direkomendasikan agar usable (tetap sederhana):
4) **Create/Edit Item** — form untuk posting
5) **Item Detail** — halaman detail (atau modal) dengan tombol WhatsApp

## 9) Flow Utama
### 9.1 Login → Home
1. User login.
2. App fetch `items` dengan status `approved` (atau sesuai policy, user juga bisa lihat item miliknya walau belum approved).
3. Tampilkan daftar item (card list).

### 9.2 Create Item → Pending
1. User membuka form “Tambah Item”.
2. Isi field required + upload foto opsional.
3. Submit → item tersimpan dengan `status = pending`.
4. UI menampilkan status “Menunggu approval admin”.

### 9.3 Admin Approve/Reject
1. Admin membuka Dashboard.
2. Lihat daftar item `pending`.
3. Klik item → review ringkas (title/desc/foto/user).
4. Pilih `approve` atau `reject`.
5. Status berubah; jika `approved` maka item tampil di Home publik.

### 9.4 Kontak WhatsApp
1. User melihat item di Home/Detail.
2. Klik tombol “WhatsApp Pemilik”.
3. App membuka deep link `https://wa.me/<nomor>` (atau `https://api.whatsapp.com/send?phone=<nomor>`).

## 10) Requirement Detail per Halaman

### 10.1 Home (setelah login)
**Tujuan:** user browsing item approved.

**Komponen minimal:**
- Header: nama app + tombol Profile + tombol Tambah Item + tombol Logout.
- List item (card):
  - foto (jika ada), `title`, `category`, `condition`
  - ringkas `wanted_item` / `barter_price` bila ada
  - badge status (untuk item miliknya jika `pending/rejected` terlihat)
  - CTA “Lihat Detail”

**Filter/sort sederhana (opsional v1):**
- Filter kategori (dropdown), sort terbaru.

**Data query:**
- Default: `items` yang `status='approved'`.
- Untuk user login, karena policy mengizinkan melihat item miliknya sendiri, UI boleh menambahkan section “Item Saya” (opsional).

**Empty state:**
- Jika belum ada item approved: tampilkan pesan + ajakan “Tambah Item”.

### 10.2 Item Detail
**Tujuan:** tampilkan info lengkap dan CTA WhatsApp.

**Komponen minimal:**
- `title`, `description`, `category`, `condition`
- `wanted_item` dan/atau `barter_price`
- Foto besar (jika ada)
- Info pemilik: `profiles.name` (jika ada), tombol WhatsApp (jika ada `profiles.whatsapp`)

**Aturan WhatsApp:**
- Jika nomor WhatsApp pemilik kosong: disable tombol dan tampilkan instruksi “Pemilik belum menambahkan nomor WhatsApp”.
- Normalisasi format nomor disarankan: simpan E.164 tanpa `+` (contoh Indonesia: `62812xxxx`).

### 10.3 Profile
**Tujuan:** user mengelola identitas & WhatsApp.

**Komponen minimal:**
- Read-only: email.
- Editable: `name`, `whatsapp`.
- Tombol Save.

**Validasi:**
- `whatsapp` boleh kosong.
- Jika diisi: hanya angka, panjang masuk akal (mis. 10–15 digit), disarankan format `62...`.

### 10.4 Create/Edit Item
**Tujuan:** user posting atau ubah listing.

**Field required:**
- `title` (min 3)
- `description` (min 10)
- `category` (string)
- `condition` (string; bisa dropdown: Baru/Bekas-Layak/Bekas-Rusak)

**Field optional:**
- `wanted_item`
- `barter_price`
- `image_url` via upload

**Perilaku status:**
- Saat create: `pending`.
- Saat edit oleh user:
  - Opsi A (paling sederhana): tetap mempertahankan status saat ini.
  - Opsi B (lebih aman moderasi): jika item sudah `approved` lalu diedit, status kembali `pending`.

Rekomendasi v1: **Opsi B** agar konten yang berubah direview ulang.

### 10.5 Admin Dashboard
**Tujuan:** moderasi listing.

**Komponen minimal:**
- Tab/Filter status: `pending` (default), `approved`, `rejected`.
- Tabel/list item:
  - title, category, owner email, created_at, status
  - aksi cepat: Approve / Reject
- Detail panel: foto + description

**Aturan akses:**
- Hanya admin (cek `profiles.is_admin`).
- Jika non-admin membuka route admin: tampilkan “Unauthorized” dan redirect ke Home.

## 11) Requirement Fungsional (User Stories)
### User
- Sebagai user, saya bisa login dan melihat listing approved.
- Sebagai user, saya bisa membuat listing baru dan menunggu approval.
- Sebagai user, saya bisa melihat status listing saya (pending/approved/rejected).
- Sebagai user, saya bisa mengubah profil (nama & WhatsApp).
- Sebagai user, saya bisa menghubungi pemilik item via WhatsApp.

### Admin
- Sebagai admin, saya bisa melihat semua listing termasuk pending.
- Sebagai admin, saya bisa approve atau reject listing.

## 12) Requirement Non-Fungsional
- **Keamanan**: patuh RLS, tidak ada admin-only data bocor di client.
- **Performa**: Home load < 2s untuk 100 item (paging sederhana).
- **Reliability**: error handling untuk upload gambar dan fetch data.
- **Usability**: form validation jelas dan pesan error ramah.

## 13) Acceptance Criteria (ringkas)
### Auth & Profile
- Setelah signup, record `profiles` otomatis dibuat (email terisi).
- User dapat update `profiles.name` dan `profiles.whatsapp` miliknya.

### Items
- User dapat membuat item, status default `pending`.
- Item `pending/rejected` tidak muncul di daftar publik (untuk user lain).
- Item `approved` muncul di Home semua user.
- Owner selalu bisa melihat item miliknya (termasuk pending/rejected).

### WhatsApp
- Tombol WhatsApp muncul jika `profiles.whatsapp` pemilik terisi.
- Klik tombol membuka URL WhatsApp yang valid.

### Admin
- Admin dashboard hanya bisa diakses admin.
- Admin bisa mengubah `items.status` menjadi `approved` atau `rejected`.

## 14) Edge Cases
- User belum mengisi WhatsApp → tombol disabled.
- Upload image gagal → item tetap bisa dibuat tanpa foto.
- User mengedit item yang sudah approved → (rekomendasi) status kembali pending.
- Admin menghapus item → item hilang dan tidak bisa diakses.

## 15) Open Questions (boleh diputuskan cepat)
1) Format penyimpanan `whatsapp`: mau E.164 (`+628...`) atau tanpa `+` (`628...`)?
2) Saat edit item approved, apakah harus re-approve (rekomendasi: ya)?
3) Apakah Home bisa diakses tanpa login? (SQL policy mengizinkan approved item dilihat “by everyone”; tapi requirement kamu bilang “home setelah login”.)

---
Jika kamu mau, aku bisa bantu lanjut bikin wireframe sederhana + checklist endpoint/query Supabase untuk tiap halaman.
