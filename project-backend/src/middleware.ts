// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Paths requiring JWT protection for API
const protectedApiPaths = ['/api/tickets', '/api/users'];

// Standard CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-user-role, x-user-email',
};

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const userRole = request.cookies.get('user_role')?.value || 'USER';

  // 0. Handle CORS Preflight
  if (request.method === 'OPTIONS') {
    return NextResponse.json({}, { headers: corsHeaders });
  }

  // --- NEW: PAGE PROTECTION LOGIC ---
  // If a regular USER tries to access any /admin path, redirect them to create a ticket

  if (path.startsWith('/admin') && userRole !== 'ADMIN' && userRole !== 'ASSIGNEE') {
    return NextResponse.redirect(new URL('/tickets/create', request.url));
  }

  if (path.startsWith('/user') && userRole === 'ADMIN') {
    return NextResponse.redirect(new URL('/admin/tickets', request.url));
  }

  // --- API PROTECTION LOGIC (JWT) ---
  const isApiProtected = protectedApiPaths.some((p) => path.startsWith(p));
  
  if (!isApiProtected) {
    const response = NextResponse.next();
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized: No token provided' },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-user-role', payload.role as string);
    requestHeaders.set('x-user-email', payload.email as string);

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });

    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid token' },
      { status: 401, headers: corsHeaders }
    );
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/api/tickets/:path*',
    '/api/users/:path*',
    '/admin/:path*',   // Added to track admin page access
    '/tickets/:path*', // Added to track general ticket page access
  ],
};
