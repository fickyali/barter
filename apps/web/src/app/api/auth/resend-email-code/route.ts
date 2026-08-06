import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { createOtp, OtpRateLimitedError } from '@/lib/otp';

export async function POST(request: Request) {
  const { email } = await request.json();
  const normalizedEmail = String(email ?? '').trim().toLowerCase();
  if (!normalizedEmail) return NextResponse.json({ ok: true });

  const rows = await query<{ id: string; email_verified_at: string | null }>('select id, email_verified_at from users where email = $1', [normalizedEmail]);
  const user = rows[0];
  if (!user || user.email_verified_at) return NextResponse.json({ ok: true });

  let code: string;
  try {
    code = await createOtp(user.id, 'email', normalizedEmail);
  } catch (error) {
    if (error instanceof OtpRateLimitedError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    throw error;
  }

  const text = `Halo,\n\nKode verifikasi email Barter kamu: ${code}\n\nKode berlaku 10 menit. Jika kamu tidak meminta kode ini, abaikan email ini.`;
  try {
    await sendEmail(normalizedEmail, 'Verifikasi Email - Barter', text);
  } catch (error) {
    console.error('Gagal kirim ulang email verifikasi:', error);
    return NextResponse.json({ error: 'Gagal mengirim email. Coba lagi nanti.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
