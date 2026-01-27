'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabaseClient';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);

  async function checkProfileRow(userId: string) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      setInfo(
        (prev) =>
          [
            prev,
            `Cek trigger profiles: gagal baca profiles (RLS/policy?): ${profileError.message}`,
            'Silakan cek manual di Supabase: Table Editor → profiles, cari row dengan id user baru.',
          ]
            .filter(Boolean)
            .join('\n')
      );
      return;
    }

    if (profile?.id) {
      setInfo((prev) => [prev, 'Cek trigger profiles: ✅ row profiles terbuat otomatis.'].filter(Boolean).join('\n'));
      return;
    }

    setInfo(
      (prev) =>
        [
          prev,
          'Cek trigger profiles: ⚠️ belum ditemukan row profiles untuk user ini.',
          'Coba klik tombol “Cek lagi” (kadang UI keburu), atau cek manual di Supabase.',
        ]
          .filter(Boolean)
          .join('\n')
    );
  }

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
    setInfo(null);
    setCreatedUserId(null);
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    const newUserId = data.user?.id ?? null;
    setCreatedUserId(newUserId);
    if (newUserId) {
      await checkProfileRow(newUserId);
    }

    // If email confirmation is enabled, session may be null.
    if (!data.session) {
      setInfo((prev) =>
        [
          prev,
          'Registrasi berhasil. Silakan cek email untuk konfirmasi, lalu login.',
        ]
          .filter(Boolean)
          .join('\n')
      );
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
              autoComplete="new-password"
              required
              minLength={6}
            />
            <div className="mt-1 text-xs text-muted">Minimal 6 karakter.</div>
          </div>

          {error ? (
            <div className="rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div>
          ) : null}

          {info ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
              <div className="whitespace-pre-line">{info}</div>
              {createdUserId ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setError(null);
                    checkProfileRow(createdUserId);
                  }}
                >
                  Cek lagi trigger profiles
                </Button>
              ) : null}
            </div>
          ) : null}

          <Button className="w-full" variant="primary" type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Register'}
          </Button>

          <div className="text-center text-sm text-gray-600">
            Sudah punya akun?{' '}
            <Link href="/login" className="font-medium text-gray-900 hover:underline">
              Login
            </Link>
          </div>
            </form>
          </Card>
        </div>
      </Container>
    </div>
  );
}
