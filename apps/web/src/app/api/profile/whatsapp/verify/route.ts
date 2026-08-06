import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { verifyOtp } from '@/lib/otp';
import { isWhatsappValid, normalizeWhatsapp } from '@/lib/whatsapp';

export async function POST(request: Request) {
  const user = await requireUser();
  const { whatsapp, code } = await request.json();
  const normalized = normalizeWhatsapp(String(whatsapp ?? ''));
  const codeValue = String(code ?? '');
  if (!normalized || !isWhatsappValid(normalized) || !codeValue) {
    return NextResponse.json({ error: 'Nomor WhatsApp dan kode wajib diisi' }, { status: 400 });
  }

  const ok = await verifyOtp(user.id, 'whatsapp', normalized, codeValue);
  if (!ok) return NextResponse.json({ error: 'Kode salah atau sudah kedaluwarsa' }, { status: 400 });

  const rows = await query('update profiles set whatsapp = $1, updated_at = now() where id = $2 returning id,email,name,whatsapp,is_admin', [normalized, user.id]);
  return NextResponse.json({ profile: rows[0] });
}
