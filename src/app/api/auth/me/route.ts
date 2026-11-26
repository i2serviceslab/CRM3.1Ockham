import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifySession, signSession, getSessionCookieOptions } from '@/lib/session';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('crm_session');

    if (sessionCookie && sessionCookie.value) {
      try {
        const payload = await verifySession(sessionCookie.value);
        if (!payload) throw new Error('Invalid session');
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          include: { tenant: true },
        });

        if (user) {
          const userObj = {
            id: user.id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            tenant: user.tenant,
          };
          const response = NextResponse.json({
            authenticated: true,
            user: userObj,
          });
          // Sliding 180-day session refresh for active authorized users
          const refreshedToken = await signSession({
            userId: user.id,
            name: user.name || 'CRM User',
            phone: user.phone,
            role: user.role,
            tenantId: user.tenantId,
            tenantName: user.tenant?.name || 'Global',
            tenantSlug: user.tenant?.slug || 'global',
          });
          response.cookies.set({
            name: 'crm_session',
            value: refreshedToken,
            ...getSessionCookieOptions(),
          });
          return response;
        }
      } catch (e) {}
      const unauthResponse = NextResponse.json({ authenticated: false, user: null });
      unauthResponse.cookies.delete('crm_session');
      return unauthResponse;
    }

    return NextResponse.json({ authenticated: false, user: null });
  } catch (error: any) {
    return NextResponse.json({ authenticated: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.action === 'LOGOUT') {
      const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
      response.cookies.delete('crm_session');
      return response;
    }
    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
