'use client';

import type { PostgrestError } from '@supabase/supabase-js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Loading } from '@/components/Loading';
import { NavBar } from '@/components/NavBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { extensionForMime, prepareImageForUpload } from '@/lib/imageUpload';
import { slugify } from '@/lib/slug';
import { supabase } from '@/lib/supabaseClient';
import type { Profile } from '@/lib/types';
import { useRequireAuth } from '@/lib/useRequireAuth';

export default function NewItemPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();

  const categoryOptions = useMemo(
    () =>
      [
        'Elektronik & Gadget',
        'Fashion & Aksesoris',
        'Hobi & Koleksi',
        'Perabotan Rumah Tangga',
        'Mainan Anak',
        'Kendaraan & Otomotif',
        'Voucher & Digital',
        'Jasa',
        'Lainnya',
      ] as const,
    []
  );

  const conditionOptions = useMemo(
    () => ['Baru', 'Like New', 'Bekas Pakai', 'Rusak ringan', 'Seadanya'] as const,
    []
  );

  const [profile, setProfile] = useState<Profile | null>(null);
  const isAdmin = useMemo(() => Boolean(profile?.is_admin), [profile?.is_admin]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [wantedItem, setWantedItem] = useState('');
  const [barterPrice, setBarterPrice] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function onPickImageFile(file: File | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;

    setImageFile(file);
    if (!file) {
      setImagePreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setImagePreviewUrl(url);
  }

  useEffect(() => {
    if (authLoading) return;

    const userId = user?.id;
    if (!userId) return;

    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      const { data } = await supabase.from('profiles').select('id,email,name,whatsapp,is_admin').eq('id', userId).single();
      if (cancelled) return;
      setProfile((data as Profile) ?? null);
      setLoading(false);
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  async function pickUniqueSlug(base: string): Promise<string> {
    const normalized = (base || 'item').replace(/-+/g, '-');
    let candidate = normalized;

    for (let suffix = 2; suffix < 50; suffix++) {
      const { data } = await supabase.from('items').select('id').eq('slug', candidate).limit(1).maybeSingle();
      if (!data) return candidate;
      candidate = `${normalized}-${suffix}`;
    }

    return `${normalized}-${crypto.randomUUID().slice(0, 8)}`;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const userId = user?.id;
    if (!userId) return;

    setError(null);

    if (title.trim().length < 3) return setError('Nama item produk minimal 3 karakter.');
    if (description.trim().length < 10) return setError('Deskripsi minimal 10 karakter.');
    if (!category.trim()) return setError('Kategori wajib diisi.');
    if (!condition.trim()) return setError('Kondisi item wajib diisi.');

    setSaving(true);

    let imageUrl: string | null = null;

    const baseSlug = slugify(title) || 'item';
    const slug = await pickUniqueSlug(baseSlug);

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

    const { error: insertError } = await supabase.from('items').insert({
      user_id: userId,
      slug,
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      condition: condition.trim(),
      wanted_item: wantedItem.trim() || null,
      barter_price: barterPrice.trim() || null,
      image_url: imageUrl,
      status: 'pending',
    });

    setSaving(false);

    if (insertError) {
      const msg = (insertError as PostgrestError).message || String(insertError);
      if (msg.toLowerCase().includes('column') && msg.toLowerCase().includes('slug') && msg.toLowerCase().includes('does not exist')) {
        setError('DB belum punya kolom slug. Jalankan SQL migration slug di SUPABASE_SETUP.md lalu coba lagi.');
      } else {
        setError(msg);
      }
      return;
    }

    router.replace('/');
  }

  if (authLoading || loading) return <Loading />;

  return (
    <div className="min-h-screen bg-background">
      <NavBar isAdmin={isAdmin} isAuthed />
      <Container className="max-w-3xl py-6">
        <h1 className="text-lg font-semibold tracking-tight">Tambah Item</h1>
        <p className="mt-1 text-sm text-muted">Item baru akan berstatus pending sampai di-approve admin.</p>

        {error ? (
          <Card className="mt-4 border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</Card>
        ) : null}

        <Card className="mt-6">
          <form onSubmit={onSubmit} className="grid gap-4 p-6">
            <div>
              <label className="block text-sm font-medium">Nama Item Produk</label>
              <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div>
              <label className="block text-sm font-medium">Deskripsi</label>
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
                <label className="block text-sm font-medium">Kategori</label>
                <select
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/15"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Pilih kategori
                  </option>
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium">Kondisi Item</label>
                <select
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/15"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Pilih kondisi
                  </option>
                  {conditionOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">Item yang diinginkan (optional)</label>
              <Input
                className="mt-1"
                value={wantedItem}
                onChange={(e) => setWantedItem(e.target.value)}
                placeholder="Mis: Tukar dengan headphone"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Perkiraan Harga Item</label>
              <Input
                className="mt-1"
                value={barterPrice}
                onChange={(e) => setBarterPrice(e.target.value)}
                placeholder="Contoh: Rp 150.000 (perkiraan)"
              />
            </div>

            <div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-start gap-3">
                  <div className="select-none text-2xl leading-none">📷</div>
                  <div className="min-w-0 flex-1">
                    <label className="block text-sm font-medium">Upload Foto (opsional)</label>
                    <p className="mt-1 text-xs text-muted">
                      JPG/PNG • Maksimal 1 MB • Akan dikompres otomatis bila perlu
                    </p>

                    <label className="mt-3 inline-flex cursor-pointer items-center rounded-xl border border-border bg-surface2 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface2/80">
                      Pilih Foto
                      <input
                        className="hidden"
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={(e) => onPickImageFile(e.target.files?.[0] ?? null)}
                      />
                    </label>

                    <div className="mt-2 text-xs text-muted-strong">
                      {imageFile ? `Terpilih: ${imageFile.name}` : 'Belum ada file dipilih'}
                    </div>
                  </div>
                </div>
              </div>
              {imagePreviewUrl ? (
                <img
                  src={imagePreviewUrl}
                  alt="Preview"
                  className="mt-3 h-40 w-40 rounded-xl border border-border object-cover shadow-sm"
                />
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => router.back()} disabled={saving}>
                Batal
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </div>
          </form>
        </Card>
      </Container>
    </div>
  );
}
