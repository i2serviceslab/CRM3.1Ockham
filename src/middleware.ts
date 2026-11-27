import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Strictly public routes (auth flows, healthcheck, and external webhooks)
const PUBLIC_ROUTES = [
  '/api/health',
  '/api/auth/me',
  '/api/auth/magic',
  '/api/auth/whatsapp-otp/send',
  '/api/auth/whatsapp-otp/verify',
  '/api/whatsapp/webhook',
  '/api/hermes/webhook',
  '/api/hermes/telegram-webhook',
  '/api/media-drive/share/',
  '/api/cron/morning-briefing',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /api routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow public routes through
  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  if (isPublic) {
    return NextResponse.next();
  }

  // Allow daemon-authenticated calls to /api/contacts when daemon header is present
  if (pathname.startsWith('/api/contacts') && request.headers.get('x-daemon-key')) {
    return NextResponse.next();
  }

  // Check session cookie
  const sessionCookie = request.cookies.get('crm_session');
  if (!sessionCookie?.value) {
    return NextResponse.json(
      { success: false, error: 'Authentication required', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  // Cookie present — allow through (route will verify JWT validity)
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
