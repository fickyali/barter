'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Loading } from '@/components/Loading';
import { NavBar } from '@/components/NavBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { itemHref } from '@/lib/itemLink';
import { extensionForMime, prepareImageForUpload } from '@/lib/imageUpload';
import { isSlug } from '@/lib/slug';
import { supabase } from '@/lib/supabaseClient';
import type { Item, Profile } from '@/lib/types';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { isUuid } from '@/lib/uuid';

export default function EditItemPage({ params }: { params: { key: string } }) {
  const { key } = use(params as unknown as Promise<{ key: string }>);
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();

  const [me, setMe] = useState<Profile | null>(null);
  const [item, setItem] = useState<Item | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [wantedItem, setWantedItem] = useState('');
  const [barterPrice, setBarterPrice] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isAdmin = useMemo(() => Boolean(me?.is_admin), [me?.is_admin]);
  const keyIsValid = useMemo(() => isUuid(key) || isSlug(key), [key]);
  const isOwner = useMemo(() => {
    const userId = user?.id;
    if (!userId || !item) return false;
    return item.user_id === userId;
  }, [item, user]);

  useEffect(() => {
    if (authLoading) return;
    const userId = user?.id;
    if (!userId) return;
    if (!keyIsValid) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const meRes = await supabase
        .from('profiles')
        .select('id,email,name,whatsapp,is_admin')
        .eq('id', userId)
        .single();

      const itemQuery = supabase.from('items').select('*');
      const itemRes = isUuid(key)
        ? await itemQuery.eq('id', key).single()
        : await itemQuery.eq('slug', key).single();

      if (cancelled) return;

      if (meRes.error) {
        setError(meRes.error.message);
        setLoading(false);
        return;
      }

      if (itemRes.error) {
        setError(itemRes.error.message);
        setLoading(false);
        return;
      }

      const loadedItem = itemRes.data as Item;
      setMe(meRes.data as Profile);
      setItem(loadedItem);

      setTitle(loadedItem.title);
      setDescription(loadedItem.description);
      setCategory(loadedItem.category);
      setCondition(loadedItem.condition);
      setWantedItem(loadedItem.wanted_item ?? '');
      setBarterPrice(loadedItem.barter_price ?? '');

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, key, keyIsValid, user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const userId = user?.id;
    if (!userId) return;
    if (!item) return;

    setError(null);
    setInfo(null);

    if (title.trim().length < 3) return setError('Judul minimal 3 karakter.');
    if (description.trim().length < 10) return setError('Deskripsi minimal 10 karakter.');
    if (!category.trim()) return setError('Category wajib diisi.');
    if (!condition.trim()) return setError('Condition wajib diisi.');

    if (item.user_id !== userId) {
      setError('Hanya pemilik item yang bisa edit.');
      return;
    }

    setSaving(true);

    let imageUrl: string | null = item.image_url;

    if (imageFile) {
      let processed: File;
      try {
        processed = await prepareImageForUpload(imageFile);
      } catch (e) {
        setSaving(false);
        setError(e instanceof Error ? e.message : 'Foto tidak valid.');
        return;
      }

      const ext = extensionForMime(processed.type);
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from('item-images').upload(path, processed, {
        upsert: false,
        contentType: processed.type || undefined,
      });

      if (uploadError) {
        setSaving(false);
        setError(`Upload image gagal: ${uploadError.message}`);
        return;
      }

      const { data: publicUrl } = supabase.storage.from('item-images').getPublicUrl(path);
      imageUrl = publicUrl.publicUrl;
    }

    const nextStatus = item.status === 'approved' ? 'pending' : item.status;

    const { error: updateError } = await supabase
      .from('items')
      .update({
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        condition: condition.trim(),
        wanted_item: wantedItem.trim() || null,
        barter_price: barterPrice.trim() || null,
        image_url: imageUrl,
        status: nextStatus,
      })
      .eq('id', item.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    if (item.status === 'approved') {
      setInfo('Berhasil di-update. Status berubah ke pending untuk review admin.');
    }

    router.replace(itemHref(item));
  }

  if (!authLoading && !keyIsValid) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar isAuthed />
        <Container className="max-w-3xl py-6">
          <Card className="border-danger/20 bg-danger/5 p-4 text-sm text-danger">Invalid item url.</Card>
        </Container>
      </div>
    );
  }

  if (authLoading || loading) return <Loading />;

  return (
    <div className="min-h-screen bg-background">
      <NavBar isAdmin={isAdmin} isAuthed />
      <Container className="max-w-3xl py-6">
        <Button type="button" variant="ghost" size="sm" onClick={() => router.back()}>
          ← Back
        </Button>

        <h1 className="mt-3 text-lg font-semibold tracking-tight">Edit Item</h1>
        {item?.status === 'approved' ? (
          <p className="mt-1 text-sm text-warning">Catatan: edit item approved akan mengubah status menjadi pending.</p>
        ) : null}

        {!isOwner ? (
          <Card className="mt-6 p-6 text-sm text-muted-strong">Hanya pemilik item yang bisa edit.</Card>
        ) : (
          <Card className="mt-6">
            <form onSubmit={onSubmit} className="p-6">
              <div className="grid gap-4">
              <div>
                <label className="text-sm font-medium">Judul</label>
                <Input
                  className="mt-1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Deskripsi</label>
                <Textarea
                  className="mt-1"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Input
                    className="mt-1"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Condition</label>
                  <Input
                    className="mt-1"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Wanted Item (opsional)</label>
                <Input
                  className="mt-1"
                  value={wantedItem}
                  onChange={(e) => setWantedItem(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Barter Price (opsional)</label>
                <Input
                  className="mt-1"
                  value={barterPrice}
                  onChange={(e) => setBarterPrice(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Ganti Foto (opsional)</label>
                <input
                  className="mt-1 block w-full text-sm text-muted-strong"
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                />
                <div className="mt-1 text-xs text-muted">
                  Hanya JPG/PNG. Maks 1MB (akan dikompres otomatis). Kalau tidak upload, foto lama tetap dipakai.
                </div>
              </div>

              {error ? (
                <Card className="border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</Card>
              ) : null}
              {info ? (
                <Card className="border-border bg-surface2 p-3 text-sm text-muted-strong">{info}</Card>
              ) : null}

              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => router.back()} disabled={saving}>
                  Batal
                </Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
            </form>
          </Card>
        )}
      </Container>
    </div>
  );
}
