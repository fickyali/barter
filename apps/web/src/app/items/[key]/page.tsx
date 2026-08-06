import type { Metadata } from 'next';

import { query } from '@/lib/db';

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
  if (!isUuid(key) && !isSlug(key)) return null;

  const rows = await query<ItemMetaRow>(
    isUuid(key)
      ? 'select id,slug,title,description,image_url,status from items where id = $1 limit 1'
      : 'select id,slug,title,description,image_url,status from items where slug = $1 limit 1',
    [key]
  );
  return rows[0] ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const { key } = await params;
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

export default async function ItemDetailPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <ItemDetailClient itemKey={key} />;
}
