import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { sendWhatsappMessage } from '@/lib/gowa';
import { createOtp, OtpRateLimitedError } from '@/lib/otp';
import { isWhatsappValid, normalizeWhatsapp } from '@/lib/whatsapp';

export async function POST(request: Request) {
  const user = await requireUser();
  const { whatsapp } = await request.json();
  const normalized = normalizeWhatsapp(String(whatsapp ?? ''));
  if (!normalized || !isWhatsappValid(normalized)) {
    return NextResponse.json({ error: 'Nomor WhatsApp tidak valid. Gunakan 10–15 digit (contoh: 62812xxxx).' }, { status: 400 });
  }

  const rows = await query<{ whatsapp: string | null }>('select whatsapp from profiles where id = $1', [user.id]);
  if (rows[0]?.whatsapp === normalized) {
    return NextResponse.json({ ok: true });
  }

  let code: string;
  try {
    code = await createOtp(user.id, 'whatsapp', normalized);
  } catch (error) {
    if (error instanceof OtpRateLimitedError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    throw error;
  }

  const message = `Kode OTP WhatsApp kamu di Barter: ${code}\n\nBerlaku 10 menit. Jangan bagikan kode ini ke siapa pun.`;
  try {
    await sendWhatsappMessage(normalized, message);
  } catch (error) {
    console.error('Gagal kirim OTP WhatsApp:', error);
    return NextResponse.json({ error: 'Gagal mengirim OTP ke WhatsApp. Pastikan nomor terdaftar di WhatsApp dan coba lagi.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
