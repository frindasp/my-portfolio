import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('portfolio_session')?.value;
  const { pathname } = request.nextUrl;

  // 1. Jika user sudah login dan mencoba akses /login, redirect ke callbackUrl atau /dashboard
  if (session && pathname === '/login') {
    const callbackUrl = request.nextUrl.searchParams.get('callbackUrl') || '/dashboard';
    return NextResponse.redirect(new URL(callbackUrl, request.url));
  }

  // 2. Jika user BELUM login dan mencoba akses dashboard, redirect ke /login dengan callbackUrl halaman yang dituju
  if (!session && pathname.startsWith('/dashboard')) {
    const fullPathWithSearch = `${pathname}${request.nextUrl.search}`;
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', fullPathWithSearch);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Hanya jalankan middleware pada route login dan dashboard sub-routes
export const config = {
  matcher: ['/login', '/dashboard/:path*'],
};
