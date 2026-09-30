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

    const syndicates = await prisma.syndicate.findMany({
      where: whereClause,
      include: { members: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, syndicates });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    
    const body = await request.json();
    const { name, description, targetFocus, memberIds, tenantId } = body;
    const effectiveTenantId = getEffectiveTenantId(session, tenantId);

    const syndicate = await prisma.syndicate.create({
      data: {
        tenantId: effectiveTenantId || null,
        name,
        description,
        targetFocus,
        members: {
          connect: (memberIds || []).map((id: string) => ({ id }))
        }
      },
      include: { members: true }
    });

    return NextResponse.json({ success: true, syndicate });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
