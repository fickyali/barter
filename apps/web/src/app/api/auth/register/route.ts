import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { withDbClient } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { createOtp } from '@/lib/otp';

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!normalizedEmail || String(password).length < 6) {
    return NextResponse.json({ error: 'Email dan password minimal 6 karakter wajib diisi' }, { status: 400 });
  }
  let userId: string;
  try {
    userId = await withDbClient(async (client) => {
      await client.query('begin');
      try {
        const result = await client.query<{ id: string; email: string }>('insert into users (email, password_hash) values ($1, $2) returning id, email', [normalizedEmail, hashPassword(String(password))]);
        await client.query('insert into profiles (id, email) values ($1, $2)', [result.rows[0].id, result.rows[0].email]);
        await client.query('commit');
        return result.rows[0].id;
      } catch (error) {
        await client.query('rollback');
        throw error;
      }
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    return NextResponse.json({ error: code === '23505' ? 'Email sudah terdaftar' : 'Register gagal' }, { status: 400 });
  }

  const code = await createOtp(userId, 'email', normalizedEmail);
  const text = `Halo,\n\nTerima kasih sudah mendaftar di Barter.\n\nKode verifikasi email kamu: ${code}\n\nKode berlaku 10 menit. Jika kamu tidak mendaftar, abaikan email ini.`;

  try {
    await sendEmail(normalizedEmail, 'Verifikasi Email - Barter', text);
  } catch (error) {
    console.error('Gagal kirim email verifikasi:', error);
    await withDbClient(async (client) => {
      await client.query('delete from users where id = $1', [userId]);
    });
    return NextResponse.json({ error: 'Gagal mengirim email verifikasi. Coba lagi.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
