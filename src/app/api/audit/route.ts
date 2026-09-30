import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, getEffectiveTenantId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const requestedTenantId = searchParams.get('tenantId');
    const effectiveTenantId = getEffectiveTenantId(session, requestedTenantId);

    const whereClause: any = {};
    if (effectiveTenantId) {
      whereClause.OR = [{ tenantId: effectiveTenantId }, { tenantId: null }];
    }

    const logs = await prisma.systemAuditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
