import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { COPPER_GIANT_TENANT_ID } from '@/lib/auth';

export async function GET() {
  try {
    const syndicates = await prisma.syndicate.findMany({
      include: { members: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, syndicates });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, targetFocus, memberIds } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    const syndicate = await prisma.syndicate.create({
      data: {
        tenantId: COPPER_GIANT_TENANT_ID,
        name,
        description,
        targetFocus,
        members: {
          connect: (memberIds || []).map((id: string) => ({ id })),
        },
      },
      include: { members: true },
    });

    return NextResponse.json({ success: true, syndicate });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
