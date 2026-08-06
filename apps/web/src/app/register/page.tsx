'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function onSubmit(e: React.FormEvent) {
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
    router.replace('/');
  }

  return (
    <div className="min-h-screen bg-background">
      <Container className="py-14">
        <div className="mx-auto max-w-md">
          <h1 className="text-xl font-semibold tracking-tight">Register</h1>
          <p className="mt-1 text-sm text-muted">Buat akun baru untuk mulai posting item.</p>
          <Card className="mt-8">
            <form onSubmit={onSubmit} className="space-y-4 p-6">
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
          </Card>
        </div>
      </Container>
    </div>
  );
}
