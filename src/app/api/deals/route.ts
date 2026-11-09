import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { COPPER_GIANT_TENANT_ID } from '@/lib/auth';

export async function GET() {
  try {
    const deals = await prisma.deal.findMany({
      include: {
        contact: true,
        quotes: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, deals });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contactId, title, amount, currency, stage, probability, expectedCloseDate } = body;

    if (!contactId || !title) {
      return NextResponse.json({ success: false, error: 'Contact ID and title are required' }, { status: 400 });
    }

    const deal = await prisma.deal.create({
      data: {
        contactId,
        title,
        amount: amount ? parseFloat(amount) : 0,
        currency: currency || 'USD',
        stage: stage || 'Prospecting',
        probability: probability ? parseInt(probability, 10) : 20,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        tenantId: COPPER_GIANT_TENANT_ID,
      },
      include: { contact: true },
    });

    await prisma.timelineActivity.create({
      data: {
        contactId,
        type: 'NOTE',
        title: `Nueva Oportunidad Creada`,
        description: `${title} - Monto: ${currency} ${amount}`,
      },
    });

    return NextResponse.json({ success: true, deal });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, stage, probability, amount } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Deal ID is required' }, { status: 400 });
    }

    const updated = await prisma.deal.update({
      where: { id },
      data: {
        stage,
        probability,
        amount: amount !== undefined ? parseFloat(amount) : undefined,
      },
      include: { contact: true },
    });

    return NextResponse.json({ success: true, deal: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
