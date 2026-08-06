import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { isSlug } from '@/lib/slug';
import { isUuid } from '@/lib/uuid';

async function getItemByKey(key: string) {
  if (isUuid(key)) return query('select * from items where id = $1 limit 1', [key]);
  if (isSlug(key)) return query('select * from items where slug = $1 limit 1', [key]);
  return [];
}

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const user = await getCurrentUser();
  const rows = await getItemByKey(key);
  const item = rows[0] as { user_id?: string; status?: string } | undefined;
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (item.status !== 'approved' && item.user_id !== user?.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const ownerRows = await query('select id,email,name,whatsapp,is_admin from profiles where id = $1', [item.user_id]);
  return NextResponse.json({ item, owner: ownerRows[0] ?? null });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const keyColumn = isUuid(key) ? 'id' : isSlug(key) ? 'slug' : null;
  if (!keyColumn) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const rows = await query(
    `update items set title=$1, description=$2, category=$3, condition=$4, wanted_item=$5, barter_price=$6, image_url=$7, status=case when status = 'approved' then 'pending'::item_status else status end where ${keyColumn}=$8 and user_id=$9 returning *`,
    [body.title, body.description, body.category, body.condition, body.wanted_item || null, body.barter_price || null, body.image_url || null, key, user.id]
  );
  return rows[0] ? NextResponse.json({ item: rows[0] }) : NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const keyColumn = isUuid(key) ? 'id' : isSlug(key) ? 'slug' : null;
  if (!keyColumn) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const rows = await query(`delete from items where ${keyColumn} = $1 and user_id = $2 returning id`, [key, user.id]);
  return rows[0] ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Not found' }, { status: 404 });
}
