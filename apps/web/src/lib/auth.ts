import { cookies } from 'next/headers';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { query } from '@/lib/db';

const cookieName = 'barter_session';

export type AuthUser = { id: string; email: string };

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const actual = Buffer.from(hash, 'hex');
  const expected = scryptSync(password, salt, 64);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function lookupHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  await query('insert into sessions (token_hash, token_lookup_hash, user_id, expires_at) values ($1, $2, $3, now() + interval \'30 days\')', [hashPassword(token), lookupHash(token), userId]);
  (await cookies()).set(cookieName, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
}

export async function clearSession() {
  const token = (await cookies()).get(cookieName)?.value;
  if (token) await query('delete from sessions where token_lookup_hash = $1', [lookupHash(token)]);
  (await cookies()).delete(cookieName);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const rows = await query<{ token_hash: string; user_id: string; email: string }>(
    'select s.token_hash, u.id as user_id, u.email from sessions s join users u on u.id = s.user_id where s.token_lookup_hash = $1 and s.expires_at > now() limit 1',
    [lookupHash(token)]
  );
  const match = rows[0];
  return match && verifyPassword(token, match.token_hash) ? { id: match.user_id, email: match.email } : null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Response('Unauthorized', { status: 401 });
  return user;
}
