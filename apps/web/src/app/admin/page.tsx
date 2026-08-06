'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Loading } from '@/components/Loading';
import { NavBar } from '@/components/NavBar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import type { Item, ItemStatus, Profile } from '@/lib/types';
import { useRequireAuth } from '@/lib/useRequireAuth';

export default function AdminPage() {
  return <AdminPageInner />;
}

function AdminPageInner() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [tab, setTab] = useState<ItemStatus>('pending');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = useMemo(() => Boolean(profile?.is_admin), [profile?.is_admin]);

  useEffect(() => {
    if (authLoading) return;
    const userId = user?.id;
    if (!userId) return;

    let cancelled = false;

    async function loadProfile() {
      const profileRes = await fetch('/api/profile');
      const profileData = await profileRes.json();

      if (cancelled) return;

      if (!profileRes.ok) {
        setError(profileData.error ?? 'Gagal memuat profile');
        setLoading(false);
        return;
      }

      setProfile(profileData.profile as Profile);
      setProfileLoaded(true);
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  useEffect(() => {
    if (!profileLoaded) return;
    if (!profile?.is_admin) router.replace('/');
  }, [profile?.is_admin, profileLoaded, router]);

  const refreshItems = useCallback(async (status: ItemStatus) => {
    setLoading(true);
    setError(null);

    const itemsRes = await fetch(`/api/admin/items?status=${encodeURIComponent(status)}`);
    const itemsData = await itemsRes.json();

    if (!itemsRes.ok) {
      setError(itemsData.error ?? 'Gagal memuat item');
      setLoading(false);
      return;
    }

    setItems((itemsData.items as Item[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshItems(tab);
  }, [isAdmin, refreshItems, tab]);

  async function setStatus(itemId: string, status: ItemStatus) {
    const prev = items;
    setItems((cur) => cur.filter((i) => i.id !== itemId));

    const updateRes = await fetch(`/api/admin/items/${encodeURIComponent(itemId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const updateData = await updateRes.json();

    if (!updateRes.ok) {
      setItems(prev);
      setError(updateData.error ?? 'Gagal update status');
      return;
    }
  }

  if (authLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-background">
      <NavBar isAdmin={isAdmin} isAuthed />
      <Container className="py-6">
        <h1 className="text-lg font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Approve / reject listing yang masuk.</p>

        {error ? (
          <Card className="mt-6 border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</Card>
        ) : null}

        {!isAdmin ? (
          <Card className="mt-6 p-6 text-sm text-muted-strong">Kamu bukan admin.</Card>
        ) : (
          <>
            <div className="mt-6 flex items-center gap-2">
              {(['pending', 'approved', 'rejected'] as ItemStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTab(s)}
                  className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                    tab === s
                      ? 'bg-surface2 text-foreground'
                      : 'border border-border bg-surface text-muted-strong hover:bg-surface2'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {loading ? (
              <Loading label="Loading admin list…" />
            ) : (
              <div className="mt-4 grid gap-3">
                {items.length === 0 ? (
                  <Card className="p-6 text-sm text-muted">Kosong.</Card>
                ) : (
                  items.map((item) => (
                    <Card key={item.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{item.title}</div>
                          <div className="mt-1 text-xs text-muted">
                            {item.category} • {item.condition}
                          </div>
                          <div className="mt-2 line-clamp-3 text-xs text-muted-strong">{item.description}</div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Badge
                              variant={
                                item.status === 'approved'
                                  ? 'success'
                                  : item.status === 'pending'
                                    ? 'warning'
                                    : 'danger'
                              }
                            >
                              {item.status}
                            </Badge>
                            <div className="text-[11px] text-muted">{new Date(item.created_at).toLocaleString()}</div>
                          </div>
                          {tab === 'pending' ? (
                            <div className="mt-2 flex items-center justify-end gap-2">
                              <Button size="sm" variant="secondary" onClick={() => setStatus(item.id, 'rejected')}>
                                Reject
                              </Button>
                              <Button size="sm" variant="primary" onClick={() => setStatus(item.id, 'approved')}>
                                Approve
                              </Button>
                            </div>
                          ) : tab === 'approved' ? (
                            <div className="mt-2 flex items-center justify-end gap-2">
                              <Button size="sm" variant="secondary" onClick={() => setStatus(item.id, 'rejected')}>
                                Move to Rejected
                              </Button>
                            </div>
                          ) : tab === 'rejected' ? (
                            <div className="mt-2 flex items-center justify-end gap-2">
                              <Button size="sm" variant="secondary" onClick={() => setStatus(item.id, 'approved')}>
                                Move to Approved
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </Container>
    </div>
  );
}
