import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';

export const COPPER_GIANT_TENANT_ID = 'be078b12-b027-44e3-8d77-144bfbe23279';

export async function getSession(): Promise<{
  userId: string;
  name: string;
  role: string;
  tenantId?: string;
  email?: string;
} | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('crm_session');
    if (!sessionCookie?.value) return null;
    const payload = await verifySession(sessionCookie.value);
    return payload as any;
  } catch {
    return null;
  }
}

export function requireRole(session: any, ...roles: string[]): boolean {
  if (!session) return false;
  return roles.includes(session.role);
}

/**
 * Single Tenant Mode:
 * No tenant scoping required. Always returns null so queries do not restrict records.
 */
export function getEffectiveTenantId(session?: any, requestedTenantId?: string | null): string | null {
  return null;
}
