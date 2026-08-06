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

  const sets: string[] = [];
  const values: unknown[] = [];
  if (name !== undefined) {
    sets.push(`name = $${sets.length + 1}`);
    values.push(name || null);
  }
  if (whatsapp === null) {
    sets.push('whatsapp = null');
  } else if (whatsapp !== undefined) {
    return NextResponse.json({ error: 'WhatsApp harus diverifikasi lewat kode OTP' }, { status: 400 });
  }
  if (sets.length === 0) {
    return NextResponse.json({ error: 'Tidak ada field yang diubah' }, { status: 400 });
  }

  sets.push('updated_at = now()');
  values.push(user.id);
  const rows = await query(`update profiles set ${sets.join(', ')} where id = $${values.length} returning id,email,name,whatsapp,is_admin`, values);
  return NextResponse.json({ profile: rows[0] });
}
