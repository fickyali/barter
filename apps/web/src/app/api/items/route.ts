import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? 12), 50);
  const offset = Number(searchParams.get('offset') ?? 0);
  const rows = await query('select * from items where status = $1 order by created_at desc limit $2 offset $3', ['approved', limit, offset]);
  return NextResponse.json({ items: rows });
}

export async function POST(request: Request) {
  const user = await requireUser();
  const body = await request.json();
  const rows = await query(
    'insert into items (user_id, slug, title, description, category, condition, wanted_item, barter_price, image_url, status) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id, slug',
    [user.id, body.slug, body.title, body.description, body.category, body.condition, body.wanted_item || null, body.barter_price || null, body.image_url || null, 'pending']
  );
  return NextResponse.json({ item: rows[0] });
}
