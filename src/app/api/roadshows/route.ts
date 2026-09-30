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

    const events = await prisma.roadshowEvent.findMany({
      where: whereClause,
      include: {
        meetings: {
          include: { contact: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, events });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    
    const body = await request.json();
    const { name, city, country, dates, boothNumber, tenantId } = body;
    const effectiveTenantId = getEffectiveTenantId(session, tenantId);

    const event = await prisma.roadshowEvent.create({
      data: {
        tenantId: effectiveTenantId || null,
        name,
        city,
        country,
        dates,
        boothNumber
      },
      include: { meetings: true }
    });

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
