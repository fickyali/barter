'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Loading } from '@/components/Loading';
import { ItemCard } from '@/components/ItemCard';
import { NavBar } from '@/components/NavBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import type { Item, Profile } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

const PAGE_SIZE = 12;

export default function HomePage() {
    // Search/filter state
    const [search, setSearch] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [filterCategory, setFilterCategory] = useState('');
    const [filterCondition, setFilterCondition] = useState('');
    const [filterPriceMin, setFilterPriceMin] = useState('');
    const [filterPriceMax, setFilterPriceMax] = useState('');

    // Option lists (should match item form)
    const categoryOptions = [
      'Elektronik & Gadget',
      'Fashion & Aksesoris',
      'Hobi & Koleksi',
      'Perabotan Rumah Tangga',
      'Mainan Anak',
      'Kendaraan & Otomotif',
      'Voucher & Digital',
      'Jasa',
      'Lainnya',
    ];
    const conditionOptions = [
      'Baru',
      'Like New',
      'Terawat',
      'Masih Layak Pakai',
      'Perlu Sedikit Perbaikan',
      'Seadanya',
    ];
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const from = page * PAGE_SIZE;
      const itemsRes = await fetch(`/api/items?limit=${PAGE_SIZE}&offset=${from}`);
      const itemsData = await itemsRes.json();

      if (cancelled) return;
      if (!itemsRes.ok) setError(itemsData.error ?? 'Gagal memuat item');
      const pageItems = (itemsData.items as Item[]) ?? [];
      setItems(pageItems);
      setHasNext(pageItems.length === PAGE_SIZE);

      const userId = user?.id;
      if (!userId) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const profileRes = await fetch('/api/profile');
      const profileData = await profileRes.json();

      if (cancelled) return;

      if (!profileRes.ok) setError(profileData.error ?? 'Gagal memuat profil');
      setProfile((profileData.profile as Profile) ?? null);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, page, user?.id]);

  if (authLoading) return <Loading />;


  return (
    <div className="min-h-screen bg-background">
      <NavBar isAdmin={profile?.is_admin} isAuthed={Boolean(user)} />

      {/* Hero Section */}
      <section className="w-full bg-transparent py-10 sm:py-16">
        <Container>
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl sm:text-3xl font-bold mb-3 leading-tight">
              Yang Biasa Buatmu, Bisa Jadi Berharga Buat Orang Lain
            </h1>
            <p className="text-base sm:text-lg text-muted mb-6 font-medium capitalize">
              Setiap Barang Punya Nilai, Meski Tak Selalu Punya Harga.
            </p>
            <button
              className="inline-block rounded-xl bg-primary px-6 py-3 text-white font-semibold shadow hover:bg-primary/90 transition"
              onClick={() => {
                const el = document.getElementById('listing-barter-section');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              Barter Sekarang
            </button>
          </div>
        </Container>
      </section>

      <Container className="py-6" id="listing-barter-section">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Mobile: Heading + + button in one row; Desktop: all in one row */}
          <div className="flex items-center justify-between w-full">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Listing Barter</h1>
              <p className="mt-1 text-sm text-muted">Hanya item berstatus approved yang tampil untuk semua user.</p>
            </div>
            {user ? (
              <>
                <span className="flex sm:hidden ml-2">
                  <Link href="/items/new">
                    <Button
                      variant="primary"
                      size="sm"
                      className="rounded-full w-10 h-10 p-0 justify-center items-center text-xl"
                      aria-label="Tambah Item"
                    >
                      +
                    </Button>
                  </Link>
                </span>
                <span className="hidden sm:inline-flex ml-4">
                  <Link href="/items/new">
                    <Button variant="primary" size="sm">
                      + Tambah Item
                    </Button>
                  </Link>
                </span>
              </>
            ) : (
              <Link href="/login">
                <Button variant="secondary" size="sm">Login untuk pasang item</Button>
              </Link>
            )}
          </div>
        </div>

        {/* Search & Advanced Filter */}
        <form
          className="mt-6 flex flex-col gap-2"
          onSubmit={e => { e.preventDefault(); setPage(0); }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 w-full">
            <input
              type="text"
              className="w-full sm:w-64 rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/15"
              placeholder="Cari nama/kata kunci..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button
              type="button"
              className="text-xs text-primary underline ml-1 mt-2 sm:mt-0"
              onClick={() => setShowAdvanced(v => !v)}
            >
              {showAdvanced ? 'Tutup Filter Lanjutan' : 'Filter Lanjutan'}
            </button>
          </div>
          {showAdvanced && (
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
              <select
                className="rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/15"
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
              >
                <option value="">Kategori</option>
                {categoryOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <select
                className="rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/15"
                value={filterCondition}
                onChange={e => setFilterCondition(e.target.value)}
              >
                <option value="">Kondisi</option>
                {conditionOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <div className="flex gap-2 min-w-[240px]">
                <input
                  type="number"
                  min="0"
                  className="w-32 rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/15"
                  placeholder="Harga Min"
                  value={filterPriceMin}
                  onChange={e => setFilterPriceMin(e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  className="w-32 rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/15"
                  placeholder="Harga Max"
                  value={filterPriceMax}
                  onChange={e => setFilterPriceMax(e.target.value)}
                />
              </div>
            </div>
          )}
        </form>

        {error ? (
          <Card className="mt-6 border-danger/20 bg-danger/5 p-4 text-sm text-danger">{error}</Card>
        ) : null}

        {loading ? (
          <Loading label="Loading items…" />
        ) : (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(() => {
              // Filtering logic
              let filtered = items;
              if (search.trim()) {
                const q = search.trim().toLowerCase();
                filtered = filtered.filter(item =>
                  item.title?.toLowerCase().includes(q) ||
                  item.description?.toLowerCase().includes(q) ||
                  item.category?.toLowerCase().includes(q) ||
                  item.condition?.toLowerCase().includes(q) ||
                  item.wanted_item?.toLowerCase().includes(q)
                );
              }
              if (showAdvanced) {
                if (filterCategory) filtered = filtered.filter(item => item.category === filterCategory);
                if (filterCondition) filtered = filtered.filter(item => item.condition === filterCondition);
                if (filterPriceMin) filtered = filtered.filter(item => {
                  const n = Number(item.barter_price);
                  return !isNaN(n) && n >= Number(filterPriceMin);
                });
                if (filterPriceMax) filtered = filtered.filter(item => {
                  const n = Number(item.barter_price);
                  return !isNaN(n) && n <= Number(filterPriceMax);
                });
              }
              if (filtered.length === 0) {
                return <Card className="p-6 text-sm text-muted">Tidak ada item yang cocok.</Card>;
              }
              return filtered.map((item) => (
                <ItemCard key={item.id} item={item} showStatus={false} />
              ));
            })()}
          </div>
        )}

        {!loading ? (
          <div className="mt-6 flex items-center justify-between">
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
               Sebelumnya
            </Button>
            <div className="text-sm text-muted">Halaman {page + 1}</div>
            <Button variant="secondary" size="sm" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
              Berikutnya 
            </Button>
          </div>
        ) : null}
      </Container>
    </div>
  );
}
