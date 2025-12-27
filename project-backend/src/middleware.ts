// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Define which paths must be protected
const protectedPaths = ['/api/tickets', '/api/users'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Check if the current path requires protection
  const isProtected = protectedPaths.some((p) => path.startsWith(p));
  
  // Allow public access to GET requests (optional, based on your rules)
  // For now, let's lock everything except Auth
  if (!isProtected) {
    return NextResponse.next();
  }

  // 2. Get the token from the header
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1]; // Remove "Bearer " prefix

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
  }

  try {
    // 3. Verify the token using 'jose'
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    // 4. Pass user info to the backend via headers (so you don't need userId in body)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-user-role', payload.role as string);
    requestHeaders.set('x-user-email', payload.email as string);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
  }
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    '/api/tickets/:path*', // Protect all ticket routes
    '/api/users/:path*',   // Protect user routes
  ],
};
