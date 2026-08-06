import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ items: [] });
  const rows = await query('select * from items where user_id = $1 order by created_at desc limit 100', [user.id]);
  return NextResponse.json({ items: rows });
}
