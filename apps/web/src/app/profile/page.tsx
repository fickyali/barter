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
import type { Item, Profile } from '@/lib/types';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { isWhatsappValid, normalizeWhatsapp } from '@/lib/whatsapp';

export default function ProfilePage() {
  return <ProfilePageInner />;
}

function ProfilePageInner() {
  const { user, loading: authLoading } = useRequireAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);

  const [typedWhatsapp, setTypedWhatsapp] = useState('');
  const [whatsappStep, setWhatsappStep] = useState<'idle' | 'otp'>('idle');
  const [otpCode, setOtpCode] = useState('');
  const [whatsappBusy, setWhatsappBusy] = useState(false);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [whatsappSuccess, setWhatsappSuccess] = useState<string | null>(null);

  const isAdmin = useMemo(() => Boolean(profile?.is_admin), [profile?.is_admin]);

  useEffect(() => {
    if (authLoading) return;
    const userId = user?.id;
    if (!userId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setNameError(null);
      setItemsError(null);

      const [profileRes, myItemsRes] = await Promise.all([fetch('/api/profile'), fetch('/api/items/mine')]);
      const [profileData, myItemsData] = await Promise.all([profileRes.json(), myItemsRes.json()]);

      if (cancelled) return;

      if (!profileRes.ok) {
        setNameError(profileData.error ?? 'Gagal memuat profile');
        setLoading(false);
        return;
      }

      if (!myItemsRes.ok) setItemsError(myItemsData.error ?? 'Gagal memuat item');
      setMyItems((myItemsData.items as Item[]) ?? []);

      const p = profileData.profile as Profile;
      setProfile(p);
      setName(p.name ?? '');
      setTypedWhatsapp(p.whatsapp ?? '');
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  async function onSaveName() {
    setNameError(null);
    setNameSuccess(null);
    setSavingName(true);
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() || null }),
    });
    const data = await res.json();
    setSavingName(false);
    if (!res.ok) {
      setNameError(data.error ?? 'Gagal menyimpan nama');
      return;
    }
    setNameSuccess('Nama tersimpan.');
    setProfile((prev) => (prev ? { ...prev, name: name.trim() || null } : prev));
  }

  async function onSendOtp() {
    setWhatsappError(null);
    setWhatsappSuccess(null);
    const normalized = normalizeWhatsapp(typedWhatsapp);
    if (!normalized || !isWhatsappValid(normalized)) {
      setWhatsappError('Nomor WhatsApp tidak valid. Gunakan 10–15 digit (contoh: 62812xxxx).');
      return;
    }
    if (normalized === profile?.whatsapp) {
      setWhatsappSuccess('Nomor sudah terverifikasi.');
      return;
    }
    setWhatsappBusy(true);
    const res = await fetch('/api/profile/whatsapp/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsapp: typedWhatsapp }),
    });
    const data = await res.json();
    setWhatsappBusy(false);
    if (!res.ok) {
      setWhatsappError(data.error ?? 'Gagal mengirim kode');
      return;
    }
    setWhatsappStep('otp');
  }

  async function onVerifyWhatsapp() {
    setWhatsappError(null);
    setWhatsappSuccess(null);
    const normalized = normalizeWhatsapp(typedWhatsapp);
    setWhatsappBusy(true);
    const res = await fetch('/api/profile/whatsapp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsapp: typedWhatsapp, code: otpCode }),
    });
    const data = await res.json();
    setWhatsappBusy(false);
    if (!res.ok) {
      setWhatsappError(data.error ?? 'Verifikasi gagal');
      return;
    }
    setWhatsappStep('idle');
    setOtpCode('');
    setWhatsappSuccess('Nomor WhatsApp tersimpan dan terverifikasi.');
    setProfile((prev) => (prev ? { ...prev, whatsapp: normalized } : prev));
  }

  async function onRemoveWhatsapp() {
    setWhatsappError(null);
    setWhatsappSuccess(null);
    setWhatsappBusy(true);
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsapp: null }),
    });
    const data = await res.json();
    setWhatsappBusy(false);
    if (!res.ok) {
      setWhatsappError(data.error ?? 'Gagal menghapus nomor');
      return;
    }
    setWhatsappStep('idle');
    setOtpCode('');
    setTypedWhatsapp('');
    setWhatsappSuccess('Nomor WhatsApp dihapus.');
    setProfile((prev) => (prev ? { ...prev, whatsapp: null } : prev));
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
              <div className="mt-1 flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama kamu"
                />
                <Button type="button" onClick={onSaveName} disabled={savingName} variant="primary" className="shrink-0">
                  {savingName ? 'Saving…' : 'Save'}
                </Button>
              </div>
              {nameError ? (
                <div className="mt-2 rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{nameError}</div>
              ) : null}
              {nameSuccess ? (
                <div className="mt-2 rounded-xl border border-success/20 bg-success/5 p-3 text-sm text-success">{nameSuccess}</div>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-medium text-muted-strong">WhatsApp</label>
              {profile?.whatsapp ? (
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground">{profile.whatsapp}</span>
                  <span className="text-xs text-success">Terverifikasi</span>
                  <Button type="button" size="sm" variant="ghost" onClick={onRemoveWhatsapp} disabled={whatsappBusy}>
                    Hapus
                  </Button>
                </div>
              ) : null}
              <div className="mt-1 flex gap-2">
                <Input
                  value={typedWhatsapp}
                  onChange={(e) => { setTypedWhatsapp(e.target.value); setWhatsappStep('idle'); setOtpCode(''); }}
                  placeholder="Contoh: 62812xxxx"
                  inputMode="numeric"
                />
                {whatsappStep === 'idle' ? (
                  <Button type="button" onClick={onSendOtp} disabled={whatsappBusy || !typedWhatsapp.trim()} variant="primary" className="shrink-0">
                    {whatsappBusy ? 'Mengirim…' : profile?.whatsapp ? 'Ganti Nomor' : 'Kirim Kode'}
                  </Button>
                ) : null}
              </div>
              {whatsappStep === 'otp' ? (
                <div className="mt-2 flex gap-2">
                  <Input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    placeholder="Kode OTP 6 digit"
                    autoFocus
                  />
                  <Button type="button" onClick={onVerifyWhatsapp} disabled={whatsappBusy || otpCode.length !== 6} variant="primary" className="shrink-0">
                    {whatsappBusy ? 'Memverifikasi…' : 'Verifikasi'}
                  </Button>
                </div>
              ) : null}
              <div className="mt-1 text-xs text-muted">Kode OTP dikirim lewat WhatsApp. Ketik 08xx akan otomatis dinormalisasi jadi 62xx.</div>
              {whatsappError ? (
                <div className="mt-2 rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{whatsappError}</div>
              ) : null}
              {whatsappSuccess ? (
                <div className="mt-2 rounded-xl border border-success/20 bg-success/5 p-3 text-sm text-success">{whatsappSuccess}</div>
              ) : null}
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
