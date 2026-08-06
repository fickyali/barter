import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  const user = await requireUser();
  const rows = await query('select id,email,name,whatsapp,is_admin from profiles where id = $1', [user.id]);
  return NextResponse.json({ profile: rows[0] ?? null });
}

export async function PATCH(request: Request) {
  const user = await requireUser();
  const { name, whatsapp } = await request.json();
  const rows = await query('update profiles set name = $1, whatsapp = $2, updated_at = now() where id = $3 returning id,email,name,whatsapp,is_admin', [name || null, whatsapp || null, user.id]);
  return NextResponse.json({ profile: rows[0] });
}
