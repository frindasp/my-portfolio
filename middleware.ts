import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('portfolio_session')?.value;
  const { pathname } = request.nextUrl;

  // 1. Jika user sudah login dan mencoba akses /login, redirect ke /dashboard
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 2. Jika user BELUM login dan mencoba akses dashboard, redirect ke /login
  if (!session && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Hanya jalankan middleware pada route login dan dashboard sub-routes
export const config = {
  matcher: ['/login', '/dashboard/:path*'],
};
