'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterInner />
    </Suspense>
  );
}

function RegisterInner() {
  const router = useRouter();
  const params = useSearchParams();
  const verifyEmail = params.get('verify');
  const verifyTarget = params.get('email');
  const [email, setEmail] = useState(verifyEmail === '1' && verifyTarget ? verifyTarget : '');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'form' | 'otp'>(verifyEmail === '1' && verifyTarget ? 'otp' : 'form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/me').then((res) => res.json()).then((data) => {
      if (!isMounted) return;
      if (data.user) router.replace('/');
    });
    return () => {
      isMounted = false;
    };
  }, [router]);

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Register gagal');
      return;
    }
    setStage('otp');
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Verifikasi gagal');
      return;
    }
    router.replace('/');
  }

  async function onResend() {
    setError(null);
    setSuccess(null);
    setLoading(true);
    const res = await fetch('/api/auth/resend-email-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Gagal mengirim ulang kode');
      return;
    }
    setSuccess('Kode baru sudah dikirim ke email kamu.');
  }

  return (
    <div className="min-h-screen bg-background">
      <Container className="py-14">
        <div className="mx-auto max-w-md">
          <h1 className="text-xl font-semibold tracking-tight">{stage === 'otp' ? 'Verifikasi Email' : 'Register'}</h1>
          <p className="mt-1 text-sm text-muted">
            {stage === 'otp'
              ? `Masukkan kode 6 digit yang dikirim ke ${email}.`
              : 'Buat akun baru untuk mulai posting item.'}
          </p>
          <Card className="mt-8">
            {stage === 'form' ? (
              <form onSubmit={onRegister} className="space-y-4 p-6">
                <div>
                  <label className="text-sm font-medium text-muted-strong">Email</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required placeholder="you@example.com" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-strong">Password</label>
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="new-password" required minLength={6} />
                </div>
                {error ? <div className="rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div> : null}
                <Button className="w-full" variant="primary" disabled={loading} type="submit">
                  {loading ? 'Creating…' : 'Register'}
                </Button>
                <div className="text-center text-sm text-gray-600">
                  Sudah punya akun?{' '}
                  <Link href="/login" className="font-medium text-gray-900 hover:underline">Login</Link>
                </div>
              </form>
            ) : (
              <form onSubmit={onVerify} className="space-y-4 p-6">
                <div>
                  <label className="text-sm font-medium text-muted-strong">Kode OTP</label>
                  <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoFocus placeholder="123456" />
                </div>
                {error ? <div className="rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div> : null}
                {success ? <div className="rounded-xl border border-success/20 bg-success/5 p-3 text-sm text-success">{success}</div> : null}
                <Button className="w-full" variant="primary" disabled={loading || code.length !== 6} type="submit">
                  {loading ? 'Verifying…' : 'Verifikasi'}
                </Button>
                <button
                  type="button"
                  className="w-full text-center text-sm font-medium text-muted-strong hover:underline disabled:opacity-50"
                  onClick={onResend}
                  disabled={loading}
                >
                  Kirim ulang kode
                </button>
              </form>
            )}
          </Card>
        </div>
      </Container>
    </div>
  );
}
