import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { query } from '@/lib/db';
import { consumeResetToken, deleteUserResetTokens } from '@/lib/resetPassword';

export async function POST(request: Request) {
  const { token, password } = await request.json();
  const pw = String(password ?? '');
  if (pw.length < 6) {
    return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
  }

  const record = await consumeResetToken(String(token ?? ''));
  if (!record) {
    return NextResponse.json({ error: 'Link tidak valid atau sudah kedaluwarsa' }, { status: 400 });
  }

  await query('update users set password_hash = $1, updated_at = now() where id = $2', [hashPassword(pw), record.user_id]);
  await query('delete from sessions where user_id = $1', [record.user_id]);
  await deleteUserResetTokens(record.user_id);

  return NextResponse.json({ ok: true });
}
