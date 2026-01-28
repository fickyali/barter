'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

export function useRequireAuth() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (loading) return;
    if (!user) router.replace('/login');
  }, [loading, router, user]);

  return { user, loading };
}
