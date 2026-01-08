// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Define which paths must be protected
const protectedPaths = ['/api/tickets', '/api/users'];

// Define standard CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Replace '*' with your specific domain in production if needed
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-user-role, x-user-email',
};

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 0. Handle CORS Preflight (OPTIONS request)
  // Browsers send this before the actual request to check permissions
  if (request.method === 'OPTIONS') {
    return NextResponse.json({}, { headers: corsHeaders });
  }

  // 1. Check if the current path requires protection
  const isProtected = protectedPaths.some((p) => path.startsWith(p));
  
  // Allow public access to GET requests (optional logic)
  if (!isProtected) {
    // Return next() but with CORS headers attached
    const response = NextResponse.next();
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // 2. Get the token from the header
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1]; // Remove "Bearer " prefix

  if (!token) {
    // Return 401 but WITH CORS headers so the frontend can actually read the error
    return NextResponse.json(
      { error: 'Unauthorized: No token provided' },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    // 3. Verify the token using 'jose'
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    // 4. Pass user info to the backend via headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-user-role', payload.role as string);
    requestHeaders.set('x-user-email', payload.email as string);

    // Create the response object passing the new headers to the backend
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // 5. Apply CORS headers to the outgoing response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    // Return 401 WITH CORS headers
    return NextResponse.json(
      { error: 'Unauthorized: Invalid token' },
      { status: 401, headers: corsHeaders }
    );
  }
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    '/api/tickets/:path*', // Protect all ticket routes
    '/api/users/:path*',   // Protect user routes
  ],
};
