import { NextResponse } from 'next/server';
import { createSession, verifyPassword } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const rows = await query<{ id: string; email: string; password_hash: string }>('select id, email, password_hash from users where email = $1', [String(email).toLowerCase()]);
  const user = rows[0];
  if (!user || !verifyPassword(String(password), user.password_hash)) {
    return NextResponse.json({ error: 'Invalid login credentials' }, { status: 401 });
  }
  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, email: user.email } });
}
