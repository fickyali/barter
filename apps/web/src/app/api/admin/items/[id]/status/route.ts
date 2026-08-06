import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const admin = await query<{ is_admin: boolean }>('select is_admin from profiles where id = $1', [user.id]);
  if (admin[0]?.is_admin !== true) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const { status } = await request.json();
  if (!['pending', 'approved', 'rejected'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  const rows = await query('update items set status = $1, updated_at = now() where id = $2 returning *', [status, id]);
  return NextResponse.json({ item: rows[0] });
}
