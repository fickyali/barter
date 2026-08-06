import { randomInt } from 'crypto';
import { query } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth';

const CODE_TTL = '10 minutes';
const MAX_ATTEMPTS = 5;
const CLEANUP_INTERVAL = 60 * 60 * 1000;
let lastCleanup = 0;

const LIMITS = {
  email: { resendWindow: '60 seconds', hourly: null },
  whatsapp: { resendWindow: '2 minutes', hourly: 3 },
} as const;

export class OtpRateLimitedError extends Error {
  constructor() {
    super('Terlalu banyak permintaan kode. Tunggu beberapa menit dan coba lagi.');
  }
}

async function cleanupStaleOtps() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  try {
    await query('delete from otps where expires_at < now()');
  } catch (error) {
    console.error('Gagal cleanup OTP:', error);
  }
}

export async function createOtp(userId: string, method: 'email' | 'whatsapp', target: string): Promise<string> {
  await cleanupStaleOtps();
  const { resendWindow, hourly } = LIMITS[method];

  const recent = await query('select 1 from otps where user_id = $1 and method = $2 and target = $3 and created_at > now() - interval \'' + resendWindow + '\' limit 1', [userId, method, target]);
  if (recent.length > 0) throw new OtpRateLimitedError();

  if (hourly) {
    const count = await query<{ n: number }>('select count(*)::int as n from otps where method = $1 and target = $2 and created_at > now() - interval \'1 hour\'', [method, target]);
    if (count[0].n >= hourly) throw new OtpRateLimitedError();
  }

  const code = String(randomInt(100000, 1000000));
  await query('insert into otps (user_id, method, target, code_hash, expires_at) values ($1, $2, $3, $4, now() + interval \'' + CODE_TTL + '\')', [userId, method, target, hashPassword(code)]);
  return code;
}

export async function verifyOtp(userId: string, method: 'email' | 'whatsapp', target: string, code: string): Promise<boolean> {
  const rows = await query<{ id: string; code_hash: string; attempts: number }>(
    'select id, code_hash, attempts from otps where user_id = $1 and method = $2 and target = $3 and expires_at > now() order by created_at desc limit 1',
    [userId, method, target]
  );
  const otp = rows[0];
  if (!otp) return false;

  if (otp.attempts >= MAX_ATTEMPTS) {
    await query('delete from otps where id = $1', [otp.id]);
    return false;
  }
  if (!verifyPassword(code, otp.code_hash)) {
    await query('update otps set attempts = attempts + 1 where id = $1', [otp.id]);
    return false;
  }

  await query('delete from otps where user_id = $1 and method = $2 and target = $3', [userId, method, target]);
  return true;
}
