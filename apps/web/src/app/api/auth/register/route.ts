import { NextResponse } from 'next/server';
import { createSession, hashPassword } from '@/lib/auth';
import { pool } from '@/lib/db';

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!normalizedEmail || String(password).length < 6) {
    return NextResponse.json({ error: 'Email dan password minimal 6 karakter wajib diisi' }, { status: 400 });
  }
  const client = await pool.connect();
  try {
    await client.query('begin');
    const user = await client.query<{ id: string; email: string }>('insert into users (email, password_hash) values ($1, $2) returning id, email', [normalizedEmail, hashPassword(String(password))]);
    await client.query('insert into profiles (id, email) values ($1, $2)', [user.rows[0].id, user.rows[0].email]);
    await client.query('commit');
    await createSession(user.rows[0].id);
    return NextResponse.json({ user: user.rows[0] });
  } catch (error) {
    await client.query('rollback');
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Register gagal' }, { status: 400 });
  } finally {
    client.release();
  }
}
