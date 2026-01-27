'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { Loading } from '@/components/Loading';
import { NavBar } from '@/components/NavBar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { itemEditHref } from '@/lib/itemLink';
import { isSlug } from '@/lib/slug';
import { supabase } from '@/lib/supabaseClient';
import type { Item, Profile } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';
import { isUuid } from '@/lib/uuid';
import { isWhatsappValid, normalizeWhatsapp, whatsappLink } from '@/lib/whatsapp';

export function ItemDetailClient({ itemKey }: { itemKey: string }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [me, setMe] = useState<Profile | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const keyIsValid = useMemo(() => isUuid(itemKey) || isSlug(itemKey), [itemKey]);

  const isAdmin = useMemo(() => Boolean(me?.is_admin), [me?.is_admin]);
  const canDelete = useMemo(() => {
    const userId = user?.id;
    if (!userId || !item) return false;
    return isAdmin || item.user_id === userId;
  }, [isAdmin, item, user]);

  const canEdit = useMemo(() => {
    const userId = user?.id;
    if (!userId || !item) return false;
    return item.user_id === userId;
  }, [item, user]);

  const ownerWa = useMemo(() => {
    const raw = owner?.whatsapp ?? '';
    const normalized = raw ? normalizeWhatsapp(raw) : '';
    return normalized && isWhatsappValid(normalized) ? normalized : null;
  }, [owner?.whatsapp]);

  useEffect(() => {
    if (authLoading) return;
    if (!keyIsValid) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const itemQuery = supabase.from('items').select('*');
      const itemRes = isUuid(itemKey)
        ? await itemQuery.eq('id', itemKey).single()
        : await itemQuery.eq('slug', itemKey).single();

      if (cancelled) return;

      if (itemRes.error) {
        setError(itemRes.error.message);
        setLoading(false);
        return;
      }

      const loadedItem = itemRes.data as Item;
      setItem(loadedItem);

      const userId = user?.id;
      if (userId) {
        const meRes = await supabase
          .from('profiles')
          .select('id,email,name,whatsapp,is_admin')
          .eq('id', userId)
          .single();

        if (!cancelled && meRes.error) {
          setError(meRes.error.message);
          setLoading(false);
          return;
        }

        if (!cancelled) setMe(meRes.data as Profile);
      } else {
        setMe(null);
      }

      const ownerRes = await supabase
        .from('profiles')
        .select('id,email,name,whatsapp,is_admin')
        .eq('id', loadedItem.user_id)
        .single();

      if (cancelled) return;

      if (ownerRes.error) {
        setError(ownerRes.error.message);
        setLoading(false);
        return;
      }

      setOwner(ownerRes.data as Profile);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, itemKey, keyIsValid, user?.id]);

  async function onDelete() {
    if (!item) return;
    if (!canDelete) return;

    const ok = confirm('Hapus item ini?');
    if (!ok) return;

    setDeleting(true);
    setError(null);

    const { error: deleteError } = await supabase.from('items').delete().eq('id', item.id);

    setDeleting(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    router.replace('/');
  }

  if (authLoading || loading) return <Loading />;

  if (!keyIsValid) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar isAuthed={Boolean(user)} />
        <Container className="max-w-3xl py-6">
          <Card className="border-danger/20 bg-danger/5 p-4 text-sm text-danger">Invalid item url.</Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar isAdmin={isAdmin} isAuthed={Boolean(user)} />
      <Container className="max-w-3xl py-6">
        <Button type="button" variant="ghost" size="sm" onClick={() => router.back()}>
          ← Back
        </Button>

        {error ? (
          <Card className="mt-4 border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</Card>
        ) : null}

        {!item ? (
          <Card className="mt-6 p-6 text-sm text-muted">Item tidak ditemukan.</Card>
        ) : (
          <Card className="mt-4 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight">{item.title}</h1>
                <div className="mt-1 text-sm text-muted">
                  {item.category} • {item.condition}
                </div>
              </div>
              {item.status !== 'approved' || isAdmin ? (
                <Badge
                  variant={
                    item.status === 'approved' ? 'success' : item.status === 'pending' ? 'warning' : 'danger'
                  }
                >
                  {item.status}
                </Badge>
              ) : null}
            </div>

            {item.image_url ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface2">
                <Image
                  src={item.image_url}
                  alt={item.title}
                  width={1200}
                  height={800}
                  className="h-auto w-full max-h-[560px] object-contain"
                />
              </div>
            ) : null}

            <div className="mt-4 whitespace-pre-wrap text-sm text-muted-strong">{item.description}</div>

            <div className="mt-4 grid gap-2 text-sm">
              {item.wanted_item ? (
                <div>
                  <span className="font-medium">Wanted:</span> {item.wanted_item}
                </div>
              ) : null}
              {item.barter_price ? (
                <div>
                  <span className="font-medium">Barter price:</span> {item.barter_price}
                </div>
              ) : null}
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-surface2 p-4">
              <div className="text-xs font-semibold text-muted">Pemilik</div>
              <div className="mt-1 text-sm text-foreground">{owner?.name || owner?.email || '—'}</div>

              <div className="mt-3 flex flex-wrap gap-2">
                {ownerWa ? (
                  <Button asChild variant="primary">
                    <a href={whatsappLink(ownerWa)} target="_blank" rel="noreferrer">
                      WhatsApp Pemilik
                    </a>
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" disabled>
                    WhatsApp tidak tersedia
                  </Button>
                )}

                {canEdit ? (
                  <Button type="button" variant="secondary" onClick={() => router.push(itemEditHref(item))}>
                    Edit
                  </Button>
                ) : null}

                {canDelete ? (
                  <Button type="button" variant="secondary" onClick={onDelete} disabled={deleting}>
                    {deleting ? 'Deleting…' : 'Delete'}
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>
        )}
      </Container>
    </div>
  );
}
