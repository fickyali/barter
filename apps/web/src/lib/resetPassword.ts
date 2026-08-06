import { createHash, randomBytes } from 'crypto';
import { query } from '@/lib/db';

const TOKEN_TTL = '30 minutes';

export function siteUrl() {
  const raw = process.env.SITE_URL || 'http://localhost:3000';
  return raw.replace(/\/$/, '');
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await query('insert into password_reset_tokens (user_id, token_hash, expires_at) values ($1, $2, now() + interval \'' + TOKEN_TTL + '\')', [userId, hashToken(token)]);
  return token;
}

export async function wasRecentlyRequested(userId: string): Promise<boolean> {
  const rows = await query('select 1 from password_reset_tokens where user_id = $1 and created_at > now() - interval \'5 minutes\' limit 1', [userId]);
  return rows.length > 0;
}

export async function consumeResetToken(token: string): Promise<{ user_id: string } | null> {
  const rows = await query<{ user_id: string }>(
    'delete from password_reset_tokens where token_hash = $1 and expires_at > now() returning user_id',
    [hashToken(token)]
  );
  return rows[0] ?? null;
}

export async function deleteUserResetTokens(userId: string) {
  await query('delete from password_reset_tokens where user_id = $1', [userId]);
}
