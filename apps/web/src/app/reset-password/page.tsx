'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Gagal mengirim email');
      return;
    }
    setDone(true);
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Gagal mereset password');
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <Card className="mt-8 p-6 text-sm text-muted-strong">
        <p className="font-medium text-foreground">
          {token ? 'Password berhasil direset.' : 'Email terkirim jika akun terdaftar.'}
        </p>
        <p className="mt-2">
          {token
            ? 'Sekarang kamu bisa login dengan password baru.'
            : 'Cek inbox (dan folder spam) untuk link reset password. Link berlaku 30 menit.'}
        </p>
        <Button className="mt-4 w-full" variant="primary" onClick={() => router.replace('/login')}>
          Ke Halaman Login
        </Button>
      </Card>
    );
  }

  return (
    <Card className="mt-8">
      <form onSubmit={token ? resetPassword : requestLink} className="p-6">
        {token ? (
          <div>
            <label className="text-sm font-medium text-muted-strong">Password Baru</label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              placeholder="Minimal 6 karakter"
            />
          </div>
        ) : (
          <div>
            <label className="text-sm font-medium text-muted-strong">Email</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>
        )}

        {error ? (
          <div className="mt-4 rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div>
        ) : null}

        <Button className="mt-4 w-full" variant="primary" disabled={loading} type="submit">
          {loading ? 'Memproses…' : token ? 'Reset Password' : 'Kirim Link Reset'}
        </Button>

        <div className="mt-3 text-center text-sm text-muted">
          Ingat password?{' '}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Login
          </Link>
        </div>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background">
      <Container className="py-14">
        <div className="mx-auto max-w-md">
          <h1 className="text-xl font-semibold tracking-tight">Reset Password</h1>
          <p className="mt-1 text-sm text-muted">
            {`Masukkan email untuk menerima link, atau buat password baru lewat link yang dikirim.`}
          </p>
          <Suspense fallback={<Card className="mt-8 p-6 text-sm text-muted">Memuat…</Card>}>
            <ResetPasswordInner />
          </Suspense>
        </div>
      </Container>
    </div>
  );
}
