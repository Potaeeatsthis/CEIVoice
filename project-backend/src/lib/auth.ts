// src/lib/auth.ts
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key-change-this');

// Password Handling
export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(plain: string, hashed: string) {
  return await bcrypt.compare(plain, hashed);
}

// JWT Handling
export async function signJWT(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h') // Token valid for 1 day
    .sign(SECRET_KEY);
}

export async function verifyJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload;
  } catch (err) {
    return null;
  }
}
