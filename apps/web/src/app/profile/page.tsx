'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Loading } from '@/components/Loading';
import { ItemCard } from '@/components/ItemCard';
import { NavBar } from '@/components/NavBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabaseClient';
import type { Item, Profile } from '@/lib/types';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { isWhatsappValid, normalizeWhatsapp } from '@/lib/whatsapp';

export default function ProfilePage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isAdmin = useMemo(() => Boolean(profile?.is_admin), [profile?.is_admin]);

  useEffect(() => {
    if (authLoading) return;
    const userId = user?.id;
    if (!userId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setItemsError(null);

      const [profileRes, myItemsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id,email,name,whatsapp,is_admin')
          .eq('id', userId)
          .single(),
        supabase
          .from('items')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      if (cancelled) return;

      if (profileRes.error) {
        setError(profileRes.error.message);
        setLoading(false);
        return;
      }

      if (myItemsRes.error) setItemsError(myItemsRes.error.message);
      setMyItems((myItemsRes.data as Item[]) ?? []);

      const p = profileRes.data as Profile;
      setProfile(p);
      setName(p.name ?? '');
      setWhatsapp(p.whatsapp ?? '');
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  async function onSave() {
    const userId = user?.id;
    if (!userId) return;

    setSuccess(null);
    setError(null);

    const normalized = whatsapp.trim() ? normalizeWhatsapp(whatsapp) : '';
    if (normalized && !isWhatsappValid(normalized)) {
      setError('Nomor WhatsApp tidak valid. Gunakan 10–15 digit (contoh: 62812xxxx).');
      return;
    }

    setSaving(true);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        name: name.trim() || null,
        whatsapp: normalized || null,
      })
      .eq('id', userId);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess('Profile tersimpan.');
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            name: name.trim() || null,
            whatsapp: normalized || null,
          }
        : prev,
    );
  }

  if (authLoading || loading) return <Loading />;

  return (
    <div className="min-h-screen bg-background">
      <NavBar isAdmin={isAdmin} isAuthed />
      <Container className="py-6 max-w-3xl">
        <h1 className="text-lg font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted">Nomor WhatsApp akan muncul sebagai tombol di listing kamu.</p>

        <Card className="mt-6">
          <div className="p-6">
          <div className="grid gap-4">
            <div>
              <div className="text-sm font-medium text-muted-strong">Email</div>
              <div className="mt-1 text-sm text-foreground">{profile?.email}</div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-strong">Nama</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama kamu"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-strong">WhatsApp</label>
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Contoh: 62812xxxx"
                inputMode="numeric"
              />
              <div className="mt-1 text-xs text-muted">Tip: kalau kamu ketik 08xx, otomatis dinormalisasi jadi 62xx.</div>
            </div>

            {error ? (
              <div className="rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div>
            ) : null}
            {success ? (
              <div className="rounded-xl border border-success/20 bg-success/5 p-3 text-sm text-success">{success}</div>
            ) : null}

            <div className="flex items-center justify-end">
              <Button type="button" onClick={onSave} disabled={saving} variant="primary">
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
          </div>
        </Card>

        <div className="mt-10">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold">Item Saya</h2>
            <Link href="/items/new">
              <Button variant="primary" size="sm">+ Tambah Item</Button>
            </Link>
          </div>

          {itemsError ? (
            <div className="mt-4 rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{itemsError}</div>
          ) : null}

          <div className="mt-4 grid gap-3">
            {myItems.length === 0 ? (
              <Card className="p-6 text-sm text-muted">Kamu belum punya item.</Card>
            ) : (
              myItems.map((item) => <ItemCard key={item.id} item={item} viewerIsAdmin={isAdmin} />)
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
