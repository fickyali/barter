import type { Item } from '@/lib/types';

export function itemKey(item: Pick<Item, 'id' | 'slug'>): string {
  return item.slug || item.id;
}

export function itemHref(item: Pick<Item, 'id' | 'slug'>): string {
  return `/items/${encodeURIComponent(itemKey(item))}`;
}

export function itemEditHref(item: Pick<Item, 'id' | 'slug'>): string {
  return `${itemHref(item)}/edit`;
}
