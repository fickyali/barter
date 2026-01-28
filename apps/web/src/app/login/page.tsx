'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SupabaseNotConfigured } from '@/components/SupabaseNotConfigured';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  if (!isSupabaseConfigured) {
    return <SupabaseNotConfigured title="Login tidak tersedia (Supabase belum diset)" showHomeLink />;
  }

  return <LoginPageInner />;
}

function LoginPageInner() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      if (data.session) router.replace('/');
    });
    return () => {
      isMounted = false;
    };
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace('/');
  }

  return (
    <div className="min-h-screen bg-background">
      <Container className="py-14">
        <div className="mx-auto max-w-md">
          <h1 className="text-xl font-semibold tracking-tight">Login</h1>
          <p className="mt-1 text-sm text-muted">Masuk untuk membuat item dan mengelola profil.</p>

          <Card className="mt-8">
            <form onSubmit={onSubmit} className="p-6">
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

          <div>
            <label className="text-sm font-medium text-muted-strong">Password</label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div>
          ) : null}

          <Button className="mt-4 w-full" variant="primary" disabled={loading} type="submit">
            {loading ? 'Signing in…' : 'Login'}
          </Button>

          <div className="text-center text-sm text-gray-600">
            Belum punya akun?{' '}
            <Link href="/register" className="font-medium text-gray-900 hover:underline">
              Register
            </Link>
          </div>
            </form>
          </Card>

          <p className="mt-6 text-xs text-muted">
            Catatan: Profile otomatis dibuat saat signup (via trigger Supabase).
          </p>
        </div>
      </Container>
    </div>
  );
}
