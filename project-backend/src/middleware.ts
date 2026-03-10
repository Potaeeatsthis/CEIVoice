// src/middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-key-change-this'
);

const PROTECTED_API_PATHS = ['/api/tickets', '/api/users'];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-user-id, x-user-role, x-user-email',
};

function addCors(response: NextResponse) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

// Match /tickets/[id] — a specific ticket, not the list
function isSpecificTicketPage(pathname: string): boolean {
  return /^\/tickets\/\d+/.test(pathname);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return NextResponse.json({}, { headers: CORS_HEADERS });
  }

  const userRole = request.cookies.get('user_role')?.value ?? 'USER';
  const hasToken = !!request.cookies.get('token')?.value;

  // Auth pages: redirect already-logged-in users
  if (pathname === '/' || pathname === '/login' || pathname === '/register') {
    if (hasToken) {
      const dest =
        userRole === 'ADMIN'
          ? '/admin/tickets'
          : userRole === 'ASSIGNEE'
          ? '/assignee/tickets'
          : '/tickets';
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return addCors(NextResponse.next());
  }

  // /tickets/[id] — allow guests through (read-only guest view handled in page)
  // but redirect staff to their own views
  if (isSpecificTicketPage(pathname)) {
    if (hasToken && userRole === 'ADMIN') {
      const id = pathname.split('/')[2];
      return NextResponse.redirect(new URL(`/admin/tickets/${id}`, request.url));
    }
    if (hasToken && userRole === 'ASSIGNEE') {
      const id = pathname.split('/')[2];
      return NextResponse.redirect(new URL(`/assignee/tickets/${id}`, request.url));
    }
    // Guests (no token) and USER role — let through
    return addCors(NextResponse.next());
  }

  // /tickets (list page) — must be logged in as USER
  if (pathname === '/tickets' || pathname.startsWith('/tickets/create')) {
    if (!hasToken) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    if (userRole === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/tickets', request.url));
    }
    if (userRole === 'ASSIGNEE') {
      return NextResponse.redirect(new URL('/assignee/tickets', request.url));
    }
  }

  // Prevent ASSIGNEE from admin area
  if (pathname.startsWith('/admin') && userRole === 'ASSIGNEE') {
    return NextResponse.redirect(new URL('/assignee/tickets', request.url));
  }

  // Prevent USER from staff areas
  if (
    (pathname.startsWith('/admin') || pathname.startsWith('/assignee')) &&
    userRole === 'USER'
  ) {
    return NextResponse.redirect(new URL('/tickets', request.url));
  }

  // Protect /user/* — must be logged in and must be USER role
  if (pathname.startsWith('/user')) {
    if (!hasToken) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    if (userRole === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/tickets', request.url));
    }
    if (userRole === 'ASSIGNEE') {
      return NextResponse.redirect(new URL('/assignee/tickets', request.url));
    }
  }

  // Protected API routes: verify JWT
  const isProtectedApi = PROTECTED_API_PATHS.some((p) => pathname.startsWith(p));

  if (!isProtectedApi) {
    return addCors(NextResponse.next());
  }

  const authHeader = request.headers.get('authorization');
  const token =
    authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : request.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized: No token provided' },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-user-role', payload.role as string);
    requestHeaders.set('x-user-email', payload.email as string);

    return addCors(NextResponse.next({ request: { headers: requestHeaders } }));
  } catch {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid token' },
      { status: 401, headers: CORS_HEADERS }
    );
  }
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/register',
    '/api/tickets/:path*',
    '/api/users/:path*',
    '/admin/:path*',
    '/assignee/:path*',
    '/tickets/:path*',
    '/tickets',
    '/user/:path*',
  ],
};