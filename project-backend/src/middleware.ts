// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const protectedApiPaths = ['/api/tickets', '/api/users'];

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

  // --- PAGE PROTECTION & ROUTING LOGIC ---

  // 1. Specific Redirect for ASSIGNEE
  // If an Assignee is at the wrong dashboard or root, send them to their specific route
  if ((path.startsWith('/user') || path.startsWith('/admin')) && userRole === 'ASSIGNEE') {
    return NextResponse.redirect(new URL('/assignee/tickets', request.url));
  }

  // 2. Specific Redirect for ADMIN
  // If an Admin tries to access /user or /assignee, push them to /admin/tickets
  if ((path.startsWith('/user') || path.startsWith('/assignee')) && userRole === 'ADMIN') {
    return NextResponse.redirect(new URL('/admin/tickets', request.url));
  }

  // 3. Protection for /admin and /assignee routes from standard USERS
  if ((path.startsWith('/admin') || path.startsWith('/assignee')) && 
      userRole !== 'ADMIN' && userRole !== 'ASSIGNEE') {
    return NextResponse.redirect(new URL('/tickets/create', request.url));
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
  let token = authHeader?.split(' ')[1];

  if (!token) {
    token = request.cookies.get('token')?.value;
  }

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
    '/api/tickets/:path*',
    '/api/users/:path*',
    '/admin/:path*', 
    '/assignee/:path*', // Added new path to matcher
    '/tickets/:path*',
    '/user/:path*', 
  ],
};
