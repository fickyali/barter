import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';

import { isSlug } from '@/lib/slug';
import { isUuid } from '@/lib/uuid';
import type { Item } from '@/lib/types';

import { ItemDetailClient } from './ItemDetailClient';

type ItemMetaRow = Pick<Item, 'id' | 'slug' | 'title' | 'description' | 'image_url' | 'status'>;

function getSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3000';
  const withProto = raw.startsWith('http') ? raw : `https://${raw}`;
  return withProto.replace(/\/$/, '');
}

function toMetaDescription(input: string | null | undefined) {
  const text = (input ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return 'Lihat detail item barter.';
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

async function fetchItemForMetadata(key: string): Promise<ItemMetaRow | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  if (!isUuid(key) && !isSlug(key)) return null;

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const query = supabase
    .from('items')
    .select('id,slug,title,description,image_url,status')
    .limit(1);

  const res = isUuid(key) ? await query.eq('id', key).maybeSingle() : await query.eq('slug', key).maybeSingle();
  if (res.error) return null;
  return (res.data as ItemMetaRow) ?? null;
}

export async function generateMetadata({ params }: { params: { key: string } }): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const { key } = await Promise.resolve(params as unknown as { key: string });
  const fallback: Metadata = {
    title: 'Item | Barter',
    description: 'Lihat detail item barter.',
  };

  const item = await fetchItemForMetadata(key);
  if (!item) return fallback;

  const title = `${item.title} | Barter`;
  const description = toMetaDescription(item.description);
  const canonical = `${siteUrl}/items/${item.slug || item.id}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      images: item.image_url
        ? [
            {
              url: item.image_url,
              alt: item.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: item.image_url ? 'summary_large_image' : 'summary',
      title,
      description,
      images: item.image_url ? [item.image_url] : undefined,
    },
  };
}

export default async function ItemDetailPage({ params }: { params: { key: string } }) {
  const { key } = await Promise.resolve(params as unknown as { key: string });
  return <ItemDetailClient itemKey={key} />;
}
