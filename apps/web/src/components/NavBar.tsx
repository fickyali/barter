'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { supabase } from '@/lib/supabaseClient';

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        'rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-surface2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20',
        active ? 'bg-surface2 text-foreground' : 'text-muted-strong'
      )}
    >
      {label}
    </Link>
  );
}

export function NavBar({ isAdmin, isAuthed }: { isAdmin?: boolean; isAuthed?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const links = useMemo(() => {
    const base = [{ href: '/', label: 'Home' }];

    if (!isAuthed) {
      return [...base, { href: '/login', label: 'Login' }, { href: '/register', label: 'Register' }];
    }

    return [
      ...base,
      { href: '/items/new', label: 'Tambah Item' },
      { href: '/profile', label: 'Profile' },
      ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
    ];
  }, [isAdmin, isAuthed]);

  async function onLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <div className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Barter
        </Link>

        <div className="hidden items-center gap-1 sm:flex">
          {links.map((l) => (
            <NavLink key={l.href} href={l.href} label={l.label} />
          ))}
          {isAuthed ? (
            <Button variant="primary" size="sm" onClick={onLogout}>
              Logout
            </Button>
          ) : null}
        </div>

        <div className="sm:hidden">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Toggle menu"
          >
            Menu
          </Button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-border bg-background/90 backdrop-blur sm:hidden">
          <div className="mx-auto max-w-5xl px-4 py-3">
            <div className="grid gap-1">
              {links.map((l) => (
                <NavLink key={l.href} href={l.href} label={l.label} />
              ))}
              {isAuthed ? (
                <Button variant="primary" onClick={onLogout}>
                  Logout
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
