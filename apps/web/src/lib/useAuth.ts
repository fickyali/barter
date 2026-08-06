'use client';

import { useEffect, useState } from 'react';

export type User = { id: string; email: string };

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        setUser(data.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setUser(null);
        setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return { user, loading };
}