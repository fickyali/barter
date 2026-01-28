import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function createMissingEnvClient(): SupabaseClient {
  const message =
    'Supabase env belum diset. Pastikan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY terisi di Environment Variables (Vercel Preview/Production) atau di .env.local untuk local.';

  const thrower = () => {
    throw new Error(message);
  };

  const proxy: unknown = new Proxy(thrower, {
    get: () => proxy,
    apply: () => {
      throw new Error(message);
    },
  });

  return proxy as SupabaseClient;
}

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMissingEnvClient();
