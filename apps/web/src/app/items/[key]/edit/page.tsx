'use client';

import Image from 'next/image';
import { use, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Loading } from '@/components/Loading';
import { NavBar } from '@/components/NavBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { formatIdr, formatIdrFromUnknown, parseIdrToNumber } from '@/lib/currency';
import { itemHref } from '@/lib/itemLink';
import { extensionForMime, prepareImageForUpload } from '@/lib/imageUpload';
import { isSlug } from '@/lib/slug';
import { extractPublicBucketObjectPath } from '@/lib/storage';
import { SupabaseNotConfigured } from '@/components/SupabaseNotConfigured';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import type { Item, Profile } from '@/lib/types';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { isUuid } from '@/lib/uuid';

export default function EditItemPage({ params }: { params: { key: string } }) {
  if (!isSupabaseConfigured) {
    return <SupabaseNotConfigured title="Edit Item tidak tersedia (Supabase belum diset)" />;
  }

  return <EditItemPageInner params={params} />;
}

function EditItemPageInner({ params }: { params: { key: string } }) {
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

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
      setBarterPrice(formatIdrFromUnknown(loadedItem.barter_price) ?? '');
      onPickImageFile(null);
      setRemoveExistingImage(false);

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
    const oldObjectPath = oldImageUrl
      ? extractPublicBucketObjectPath(oldImageUrl, 'item-images')
      : null;
    let newObjectPath: string | null = null;
    let newFolder: string | null = null;
    let baseNameForCleanup: string | null = null;

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
      newFolder = folder;
      baseNameForCleanup = safeBase;

      const { error: uploadError } = await supabase.storage.from('item-images').upload(path, processed, {
        upsert: true,
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

    const updateRes = await supabase.from('items').update(payload).eq('id', item.id);
    const updateError = updateRes.error;

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    // If user uploaded a new image, clean up older files that share the same slug base.
    // Or if user requested to remove the old image (and didn't upload a new one), also delete old image.
    if (imageFile || (removeExistingImage && oldObjectPath)) {
      const foldersToCheck = new Set<string>();

      if (newFolder) foldersToCheck.add(newFolder);
      if (oldObjectPath) {
        const oldFolder = oldObjectPath.split('/').slice(0, -1).join('/');
        if (oldFolder) foldersToCheck.add(oldFolder);
      }

      const removePaths = new Set<string>();

      // Always try common extension variants (Supabase Storage won't automatically remove the old ext).
      // This fixes cases like first upload: dompet-lama.jpg, then replace: dompet-lama.png.
      const possibleExts = ['jpg', 'jpeg', 'png'];
      if (baseNameForCleanup) {
        for (const folder of foldersToCheck) {
          for (const ext of possibleExts) {
            const candidate = `${folder}/${baseNameForCleanup}.${ext}`;
            if (newObjectPath && candidate === newObjectPath) continue;
            removePaths.add(candidate);
          }
        }
      }

      // Always prefer deleting the exact old object path if it's different.
      if (oldObjectPath && (imageFile ? oldObjectPath !== newObjectPath : true)) {
        removePaths.add(oldObjectPath);
      }

      // Also best-effort: list and delete any sibling objects in the same folder that start with the same base name.
      // This handles unexpected extensions or older naming conventions.
      if (baseNameForCleanup) {
        for (const folder of foldersToCheck) {
          const { data: objects, error: listError } = await supabase.storage
            .from('item-images')
            .list(folder, { limit: 200 });

          if (listError) {
            console.error('Failed to list Storage folder for cleanup:', listError);
            setError(
              `Item berhasil disimpan, tapi gagal memeriksa foto lama di Storage: ${listError.message}. ` +
                'Pastikan policy Storage bucket item-images mengizinkan select/list.'
            );
            return;
          }

          for (const obj of objects ?? []) {
            if (!obj?.name) continue;
            if (!obj.name.startsWith(`${baseNameForCleanup}.`)) continue;
            const fullPath = `${folder}/${obj.name}`;
            if (newObjectPath && fullPath === newObjectPath) continue;
            removePaths.add(fullPath);
          }
        }
      }

      if (removePaths.size > 0) {
        const { error: removeError } = await supabase.storage
          .from('item-images')
          .remove(Array.from(removePaths));

        if (removeError) {
          console.error('Failed to remove old image(s) from Storage:', removeError);
          setError(
            `Item berhasil disimpan, tapi gagal menghapus foto lama di Storage: ${removeError.message}. ` +
              'Pastikan policy Storage bucket item-images mengizinkan delete untuk owner.'
          );
          return;
        }
      }
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
                    <img
                      src={imagePreviewUrl}
                      alt="Preview foto baru"
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
                      src={item.image_url}
                      alt="Foto saat ini"
                      width={320}
                      height={320}
                      className="h-40 w-40 object-cover"
                    />
                    <button
                      type="button"
                      className="absolute top-0 right-0 m-1 rounded-full bg-danger text-white w-7 h-7 flex items-center justify-center shadow"
                      title="Hapus gambar ini"
                      onClick={() => { setRemoveExistingImage(true); setImagePreviewUrl(null); setImageFile(null); }}
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
