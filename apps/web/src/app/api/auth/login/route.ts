import { NextResponse } from 'next/server';
import { createSession, verifyPassword } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const normalizedEmail = String(email).trim().toLowerCase();
  const rows = await query<{ id: string; email: string; password_hash: string; email_verified_at: string | null }>('select id, email, password_hash, email_verified_at from users where email = $1', [normalizedEmail]);
  const user = rows[0];
  if (!user || !verifyPassword(String(password), user.password_hash)) {
    return NextResponse.json({ error: 'Invalid login credentials' }, { status: 401 });
  }
  if (!user.email_verified_at) {
    return NextResponse.json({ error: 'EMAIL_NOT_VERIFIED', email: user.email }, { status: 403 });
  }
  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, email: user.email } });
}
