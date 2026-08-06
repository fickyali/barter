import { NextResponse } from 'next/server';
import { createSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { verifyOtp } from '@/lib/otp';

export async function POST(request: Request) {
  const { email, code } = await request.json();
  const normalizedEmail = String(email ?? '').trim().toLowerCase();
  const codeValue = String(code ?? '');
  if (!normalizedEmail || !codeValue) {
    return NextResponse.json({ error: 'Email dan kode wajib diisi' }, { status: 400 });
  }

  const rows = await query<{ id: string; email: string; email_verified_at: string | null }>('select id, email, email_verified_at from users where email = $1', [normalizedEmail]);
  const user = rows[0];
  if (!user) return NextResponse.json({ error: 'Kode tidak valid atau sudah kedaluwarsa' }, { status: 400 });

  if (!user.email_verified_at) {
    const ok = await verifyOtp(user.id, 'email', normalizedEmail, codeValue);
    if (!ok) return NextResponse.json({ error: 'Kode salah atau sudah kedaluwarsa' }, { status: 400 });
    await query('update users set email_verified_at = now() where id = $1', [user.id]);
  }

  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, email: user.email } });
}
