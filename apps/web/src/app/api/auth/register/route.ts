import { NextResponse } from 'next/server';
import { createSession, hashPassword } from '@/lib/auth';
import { withDbClient } from '@/lib/db';

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!normalizedEmail || String(password).length < 6) {
    return NextResponse.json({ error: 'Email dan password minimal 6 karakter wajib diisi' }, { status: 400 });
  }
  try {
    const user = await withDbClient(async (client) => {
      await client.query('begin');
      try {
        const result = await client.query<{ id: string; email: string }>('insert into users (email, password_hash) values ($1, $2) returning id, email', [normalizedEmail, hashPassword(String(password))]);
        await client.query('insert into profiles (id, email) values ($1, $2)', [result.rows[0].id, result.rows[0].email]);
        await client.query('commit');
        return result.rows[0];
      } catch (error) {
        await client.query('rollback');
        throw error;
      }
    });
    await createSession(user.id);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Register gagal' }, { status: 400 });
  }
}
