import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';

async function isAdmin(userId: string) {
  const rows = await query<{ is_admin: boolean }>('select is_admin from profiles where id = $1', [userId]);
  return rows[0]?.is_admin === true;
}

export async function GET(request: Request) {
  const user = await requireUser();
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? 'pending';
  const rows = await query('select * from items where status = $1 order by created_at desc limit 100', [status]);
  return NextResponse.json({ items: rows });
}
