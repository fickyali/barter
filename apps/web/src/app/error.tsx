'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Intentionally minimal: avoid noisy logs in production.
    // Still useful in Vercel Preview console.
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background">
      <Container className="py-10">
        <div className="mx-auto max-w-xl">
          <h1 className="text-xl font-semibold tracking-tight">Terjadi error</h1>
          <p className="mt-2 text-sm text-muted">
            Kalau ini terjadi di Vercel Preview, biasanya karena environment variables belum terpasang atau ada error runtime.
          </p>

          <Card className="mt-6 p-6">
            <div className="text-sm text-muted-strong">{error.message || 'Unknown error'}</div>
            {error.digest ? (
              <div className="mt-2 text-xs text-muted">Digest: {error.digest}</div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <Button type="button" variant="primary" onClick={() => reset()}>
                Coba lagi
              </Button>
              <Button type="button" variant="secondary" onClick={() => (window.location.href = '/')}
              >
                Ke Home
              </Button>
            </div>
          </Card>
        </div>
      </Container>
    </div>
  );
}
