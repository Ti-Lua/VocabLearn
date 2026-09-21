import crypto from 'node:crypto';
import { cookies } from 'next/headers';

const SESSION_SECRET = process.env.SESSION_SECRET || 'learnvocab-by-ti-lua-secure-session-key-2026';
export const SESSION_COOKIE_NAME = 'learnvocab_session';

export interface SessionPayload {
  userId: string;
  username: string;
  email?: string | null;
  exp: number; // Unix timestamp in seconds
}

/**
 * Tạo token đã ký bằng HMAC SHA-256
 */
export function signSessionToken(payload: Omit<SessionPayload, 'exp'>, expiresInDays = 30): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60;
  const fullPayload: SessionPayload = { ...payload, exp };

  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Xác minh token và trả về payload nếu hợp lệ
 */
export function verifySessionToken(token: string | null | undefined): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');

  // Chống timing attack
  if (signature.length !== expectedSig.length) return null;
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const payload: SessionPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Token hết hạn
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Lấy session hiện tại từ request cookies (Next.js server-side)
 */
export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}
