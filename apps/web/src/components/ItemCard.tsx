'use client';

import Image from 'next/image';
import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { formatIdrFromUnknown } from '@/lib/currency';
import { itemHref } from '@/lib/itemLink';
import type { Item } from '@/lib/types';

export function ItemCard({
  item,
  showStatus = true,
  viewerIsAdmin = false,
}: {
  item: Item;
  showStatus?: boolean;
  viewerIsAdmin?: boolean;
}) {
  // Only show status badge if explicitly requested (e.g. admin page)
  const shouldShowStatus = showStatus && viewerIsAdmin;
  const badgeVariant =
    item.status === 'approved' ? 'success' : item.status === 'pending' ? 'warning' : 'danger';

  return (
    <Link
      href={itemHref(item)}
      className="block rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:bg-surface2 h-full"
    >
      <div className="flex flex-col h-full">
        <div className="flex items-start gap-4">
          {item.image_url ? (
            <div className="shrink-0 overflow-hidden rounded-xl border border-border bg-surface2">
              <Image
                src={item.image_url}
                alt={item.title}
                width={120}
                height={120}
                className="h-[88px] w-[88px] object-cover"
              />
            </div>
          ) : (
            <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-xl border border-border bg-surface2 text-[11px] text-muted">
              No foto
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{item.title}</div>
            <div className="mt-1 text-xs text-muted">
              {item.category}  {item.condition}
            </div>
            {item.wanted_item ? (
              <div className="mt-2 text-xs text-muted-strong">
                <span className="font-medium">Ingin:</span> {item.wanted_item}
              </div>
            ) : null}
            {item.barter_price ? (
              <div className="mt-1 text-xs text-muted-strong">
                <span className="font-medium">Perkiraan Harga Item:</span>{' '}
                {formatIdrFromUnknown(item.barter_price)}
              </div>
            ) : null}
          </div>
        </div>
        {shouldShowStatus ? (
          <div className="mt-2 self-end">
            <Badge variant={badgeVariant}>{item.status}</Badge>
          </div>
        ) : null}
      </div>
    </Link>
  );
}
