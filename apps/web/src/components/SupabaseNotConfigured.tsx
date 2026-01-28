'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';

export function SupabaseNotConfigured(props: { title?: string; showHomeLink?: boolean }) {
  const { title = 'Konfigurasi Supabase belum lengkap', showHomeLink = true } = props;

  return (
    <div className="min-h-screen bg-background">
      <Container className="py-10">
        <div className="mx-auto max-w-xl">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted">
            Aplikasi butuh environment variables Supabase agar bisa jalan. Di Vercel, pastikan env vars ada di
            scope <span className="font-medium text-foreground">Preview</span> dan{' '}
            <span className="font-medium text-foreground">Production</span>.
          </p>

          <Card className="mt-6 p-6">
            <div className="space-y-3 text-sm text-muted-strong">
              <div>
                Tambahkan dua env berikut:
                <div className="mt-2 rounded-xl border border-border bg-surface2 p-3 font-mono text-xs text-foreground">
                  NEXT_PUBLIC_SUPABASE_URL
                  <br />
                  NEXT_PUBLIC_SUPABASE_ANON_KEY
                </div>
              </div>
              <div>
                Setelah itu, redeploy Preview. Kalau kamu lagi local dev, isi di <span className="font-medium">.env.local</span>{' '}
                (jangan di-commit).
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {showHomeLink ? (
                <Button asChild variant="secondary">
                  <Link href="/">Kembali ke Home</Link>
                </Button>
              ) : null}
              <Button asChild variant="primary">
                <a
                  href="https://vercel.com/docs/projects/environment-variables"
                  target="_blank"
                  rel="noreferrer"
                >
                  Panduan Vercel Env Vars
                </a>
              </Button>
            </div>
          </Card>
        </div>
        <div className="mt-6 text-xs text-muted-strong text-center">Barter.biz.id - Yang Biasa Buatmu, Bisa Jadi Berharga Buat Orang Lain.</div>
      </Container>
    </div>
  );
}
