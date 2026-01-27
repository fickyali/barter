'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Loading } from '@/components/Loading';
import { ItemCard } from '@/components/ItemCard';
import { NavBar } from '@/components/NavBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { supabase } from '@/lib/supabaseClient';
import type { Item, Profile } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

const PAGE_SIZE = 12;

export default function HomePage() {
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
      const to = from + PAGE_SIZE - 1;

      const itemsRes = await supabase
        .from('items')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (cancelled) return;
      if (itemsRes.error) setError(itemsRes.error.message);
      const pageItems = (itemsRes.data as Item[]) ?? [];
      setItems(pageItems);
      setHasNext(pageItems.length === PAGE_SIZE);

      const userId = user?.id;
      if (!userId) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const profileRes = await supabase
        .from('profiles')
        .select('id,email,name,whatsapp,is_admin')
        .eq('id', userId)
        .single();

      if (cancelled) return;

      if (profileRes.error) setError(profileRes.error.message);
      setProfile((profileRes.data as Profile) ?? null);
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
      <Container className="py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Listing Barter</h1>
            <p className="mt-1 text-sm text-muted">Hanya item berstatus approved yang tampil untuk semua user.</p>
          </div>

          {user ? (
            <Link href="/items/new">
              <Button variant="primary" size="sm">+ Tambah Item</Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button variant="secondary" size="sm">Login untuk pasang item</Button>
            </Link>
          )}
        </div>

        {error ? (
          <Card className="mt-6 border-danger/20 bg-danger/5 p-4 text-sm text-danger">{error}</Card>
        ) : null}

        {loading ? (
          <Loading label="Loading items…" />
        ) : (
          <div className="mt-6 grid gap-3">
            {items.length === 0 ? (
              <Card className="p-6 text-sm text-muted">Belum ada item approved.</Card>
            ) : (
              items.map((item) => (
                <ItemCard key={item.id} item={item} viewerIsAdmin={Boolean(profile?.is_admin)} />
              ))
            )}
          </div>
        )}

        {!loading ? (
          <div className="mt-6 flex items-center justify-between">
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              ← Prev
            </Button>
            <div className="text-sm text-muted">Page {page + 1}</div>
            <Button variant="secondary" size="sm" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
              Next →
            </Button>
          </div>
        ) : null}
      </Container>
    </div>
  );
}
