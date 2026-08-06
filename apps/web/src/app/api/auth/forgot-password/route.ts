import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { createResetToken, siteUrl, wasRecentlyRequested } from '@/lib/resetPassword';

export async function POST(request: Request) {
  const { email } = await request.json();
  const normalized = String(email ?? '').trim().toLowerCase();
  if (!normalized) return NextResponse.json({ ok: true });

  const rows = await query<{ id: string }>('select id from users where email = $1', [normalized]);
  const user = rows[0];
  if (!user || (await wasRecentlyRequested(user.id))) return NextResponse.json({ ok: true });

  const token = await createResetToken(user.id);
  const link = `${siteUrl()}/reset-password?token=${token}`;
  const text = `Halo,\n\nKami menerima permintaan reset password akun Barter kamu.\n\nKlik link berikut untuk membuat password baru:\n${link}\n\nLink ini berlaku 30 menit dan hanya bisa dipakai sekali.\n\nJika kamu tidak meminta reset password, abaikan email ini.`;

  try {
    await sendEmail(normalized, 'Reset Password - Barter', text);
  } catch (error) {
    console.error('Gagal kirim email reset password:', error);
    return NextResponse.json({ error: 'Gagal mengirim email. Coba lagi nanti.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
