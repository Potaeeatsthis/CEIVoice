// src/lib/auth.ts

import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-key-change-this'
);

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
  return await bcrypt.compare(plain, hashed);
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export async function signJWT(payload: JWTPayload): Promise<string> {
  return await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET_KEY);
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export const AUTH_COOKIE = 'token';
export const ROLE_COOKIE = 'user_role';
export const RESET_COOKIE = 'reset_flow_token';

export const cookieOptions = {
  httpOnly: true,
  path: '/',
  maxAge: 60 * 60 * 24, // 1 day
  sameSite: 'lax' as const,  // 'lax' allows cookies on cross-site GET navigations (e.g. email links)
  secure: process.env.NODE_ENV === 'production',
};