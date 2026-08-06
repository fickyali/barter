'use client';

import Image from 'next/image';
import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Loading } from '@/components/Loading';
import { NavBar } from '@/components/NavBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { formatIdr, formatIdrFromUnknown, parseIdrToNumber } from '@/lib/currency';
import { r2ImageSrc } from '@/lib/imageSrc';
import { itemHref } from '@/lib/itemLink';
import { extensionForMime, prepareImageForUpload } from '@/lib/imageUpload';
import { useImageUpload } from '../useImageUpload';
import { isSlug } from '@/lib/slug';
import { extractPublicObjectPath } from '@/lib/storage';
import type { Item, Profile } from '@/lib/types';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { isUuid } from '@/lib/uuid';

export default function EditItemPage({ params }: { params: { key: string } }) {
  return <EditItemPageInner params={params} />;
}

function EditItemPageInner({ params }: { params: { key: string } }) {
    // Deteksi mobile/tablet untuk show/hide tombol kamera
    const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
  const { key } = use(params as unknown as Promise<{ key: string }>);
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
    () => [
      'Baru',
      'Like New',
      'Terawat',
      'Masih Layak Pakai',
      'Perlu Sedikit Perbaikan',
      'Seadanya',
    ] as const,
    []
  );

  const [me, setMe] = useState<Profile | null>(null);
  const [item, setItem] = useState<Item | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [wantedItem, setWantedItem] = useState('');
  const [barterPrice, setBarterPrice] = useState('');
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  // Use custom hook for image upload state/logic
  const {
    imageFile,
    imagePreviewUrl,
    error,
    setError,
    onPickImageFile,
    reset: resetImageUpload,
  } = useImageUpload();

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

      const [meRes, itemRes] = await Promise.all([fetch('/api/profile'), fetch(`/api/items/${encodeURIComponent(key)}`)]);
      const [meData, itemData] = await Promise.all([meRes.json(), itemRes.json()]);

      if (cancelled) return;

      if (!meRes.ok) {
        setError(meData.error ?? 'Gagal memuat profile');
        setLoading(false);
        return;
      }

      if (!itemRes.ok) {
        setError(itemData.error ?? 'Gagal memuat item');
        setLoading(false);
        return;
      }

      const loadedItem = itemData.item as Item;
      setMe(meData.profile as Profile);
      setItem(loadedItem);

      setTitle(loadedItem.title);
      setDescription(loadedItem.description);
      setCategory(loadedItem.category);
      setCondition(loadedItem.condition);
      setWantedItem(loadedItem.wanted_item ?? '');
      setBarterPrice(formatIdrFromUnknown(loadedItem.barter_price) ?? '');
      resetImageUpload();
      setRemoveExistingImage(false);

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, key, keyIsValid, resetImageUpload, setError, user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const userId = user?.id;
    if (!userId) return;
    if (!item) return;

    setError(null);
    setInfo(null);

    if (title.trim().length < 3) return setError('Nama item produk minimal 3 karakter.');
    if (description.trim().length < 10) return setError('Deskripsi minimal 10 karakter.');
    if (!category.trim()) return setError('Kategori wajib diisi.');
    if (!condition.trim()) return setError('Kondisi item wajib diisi.');

    const priceNumber = barterPrice.trim() ? parseIdrToNumber(barterPrice) : null;
    if (barterPrice.trim() && priceNumber === null)
      return setError('Perkiraan Harga Item tidak valid. Masukkan angka, mis. Rp 10.000.');

    if (item.user_id !== userId) {
      setError('Hanya pemilik item yang bisa edit.');
      return;
    }

    setSaving(true);

    let imageUrl: string | null = item.image_url;
    const oldImageUrl = item.image_url;
    const oldObjectPath = oldImageUrl ? extractPublicObjectPath(oldImageUrl) : null;
    let newObjectPath: string | null = null;

    if (removeExistingImage && !imageFile) {
      // User wants to remove the old image and did not upload a new one
      imageUrl = null;
    }

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
      const safeBase = ((item.slug ?? '').trim() || 'item').slice(0, 80);
      const year = new Date().getFullYear();
      const folder = `image/${year}`;
      const path = `${folder}/${safeBase}.${ext}`;
      newObjectPath = path;

      const form = new FormData();
      form.set('file', processed);
      form.set('path', path);
      const uploadRes = await fetch('/api/storage/upload', { method: 'POST', body: form });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        setSaving(false);
        setError(`Upload image gagal: ${uploadData.error ?? 'Unknown error'}`);
        return;
      }

      imageUrl = uploadData.publicUrl;
    }

    const nextStatus = item.status === 'approved' ? 'pending' : item.status;

    const payload = {
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      condition: condition.trim(),
      wanted_item: wantedItem.trim() || null,
      // IMPORTANT: store as number for Postgres bigint, format only for UI.
      barter_price: priceNumber,
      image_url: imageUrl,
      status: nextStatus,
    };

    const updateRes = await fetch(`/api/items/${encodeURIComponent(item.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const updateData = await updateRes.json();

    setSaving(false);

    if (!updateRes.ok) {
      setError(updateData.error ?? 'Gagal menyimpan item');
      return;
    }

    resetImageUpload();
    setRemoveExistingImage(false);

    if (oldObjectPath && (removeExistingImage || imageFile) && oldObjectPath !== newObjectPath) {
      await fetch(`/api/storage/object/${oldObjectPath}`, { method: 'DELETE' });
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
          ← Kembali
        </Button>

        <h1 className="mt-3 text-lg font-semibold tracking-tight">Edit Item</h1>
        {item?.status === 'approved' ? (
          <p className="mt-1 text-sm text-warning">Catatan: edit item yang sudah approved akan mengubah status menjadi pending.</p>
        ) : null}

        {!isOwner ? (
          <Card className="mt-6 p-6 text-sm text-muted-strong">Hanya pemilik item yang bisa edit.</Card>
        ) : (
          <Card className="mt-6">
            <form onSubmit={onSubmit} className="p-6">
              <div className="grid gap-4">
              <div>
                <label className="text-sm font-medium">Nama Item Produk</label>
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
                  <label className="text-sm font-medium">Kategori</label>
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
                  <label className="text-sm font-medium">Kondisi Item</label>
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
                <label className="text-sm font-medium">Item yang diinginkan (optional)</label>
                <Input
                  className="mt-1"
                  value={wantedItem}
                  onChange={(e) => setWantedItem(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Perkiraan Harga Item</label>
                <Input
                  className="mt-1"
                  value={barterPrice}
                  onChange={(e) => setBarterPrice(e.target.value)}
                  onBlur={() => {
                    const n = parseIdrToNumber(barterPrice);
                    if (n === null) {
                      if (!barterPrice.trim()) return;
                      return;
                    }
                    setBarterPrice(formatIdr(n));
                  }}
                  inputMode="numeric"
                  placeholder="Rp 10.000"
                />
                <div className="mt-1 text-xs text-muted">
                  {(() => {
                    const n = parseIdrToNumber(barterPrice);
                    if (n === null) return 'Masukkan angka (boleh tanpa titik), nanti diformat otomatis.';
                    return `Akan tampil sebagai: ${formatIdr(n)}`;
                  })()}
                </div>
              </div>

              <div>
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-start gap-3">
                    <div className="select-none text-2xl leading-none">🖼️</div>
                    <div className="min-w-0 flex-1">
                      <label className="block text-sm font-medium">Upload Foto</label>
                      <p className="mt-1 text-xs text-muted">
                        JPG/PNG • Maksimal 1 MB • Akan dikompres otomatis bila perlu
                      </p>
                      <p className="mt-1 text-xs text-muted">Kalau tidak upload, foto lama tetap dipakai.</p>

                      <div className="flex gap-2 mt-3">
                        <label className="inline-flex cursor-pointer items-center rounded-xl border border-border bg-surface2 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface2/80">
                          {imageFile ? 'Ganti Foto' : 'Pilih Foto'}
                          <input
                            className="hidden"
                            type="file"
                            accept="image/*"
                            onChange={(e) => onPickImageFile(e.target.files?.[0] ?? null)}
                          />
                        </label>
                        {isMobile && (
                          <label className="inline-flex cursor-pointer items-center rounded-xl border border-border bg-surface2 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface2/80">
                            Buka Kamera
                            <input
                              className="hidden"
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={(e) => onPickImageFile(e.target.files?.[0] ?? null)}
                            />
                          </label>
                        )}
                      </div>

                      {imageFile ? (
                        <button
                          type="button"
                          className="ml-2 inline-flex items-center rounded-xl border border-border bg-surface2 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface2/80"
                          onClick={() => onPickImageFile(null)}
                        >
                          Batalkan
                        </button>
                      ) : null}

                      <div className="mt-2 text-xs text-muted-strong">
                        {imageFile ? `Terpilih: ${imageFile.name}` : 'Belum ada file dipilih'}
                      </div>
                    </div>
                  </div>
                </div>

                {imagePreviewUrl ? (
                  <div className="relative inline-block">
                    <Image
                      src={imagePreviewUrl}
                      alt="Preview foto baru"
                      width={160}
                      height={160}
                      unoptimized
                      className="mt-3 h-40 w-40 rounded-xl border border-border object-cover shadow-sm"
                    />
                    <button
                      type="button"
                      className="absolute top-0 right-0 m-1 rounded-full bg-danger text-white w-7 h-7 flex items-center justify-center shadow"
                      title="Batalkan foto baru"
                      onClick={() => onPickImageFile(null)}
                    >
                      ×
                    </button>
                  </div>
                ) : (!removeExistingImage && item?.image_url) ? (
                  <div className="relative mt-3 inline-block overflow-hidden rounded-xl border border-border bg-surface2">
                    <Image
                      src={r2ImageSrc(item.image_url) ?? ''}
                      alt="Foto saat ini"
                      width={320}
                      height={320}
                      className="h-40 w-40 object-cover"
                    />
                    <button
                      type="button"
                      className="absolute top-0 right-0 m-1 rounded-full bg-danger text-white w-7 h-7 flex items-center justify-center shadow"
                      title="Hapus gambar ini"
                      onClick={() => { setRemoveExistingImage(true); resetImageUpload(); }}
                    >
                      ×
                    </button>
                  </div>
                ) : null}
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
                  {saving ? 'Menyimpan…' : 'Simpan'}
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
