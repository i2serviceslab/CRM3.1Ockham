import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, getEffectiveTenantId } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const { id } = await params;
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        timelineActivities: { orderBy: { createdAt: 'desc' } },
        deals: { include: { quotes: true } },
        quotes: true,
        documents: true,
        interactions: { orderBy: { createdAt: 'desc' } },
        sourceRelationships: { include: { targetContact: true } },
        targetRelationships: { include: { sourceContact: true } },
      },
    });

    if (!contact) {
      return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
    }

    const effectiveTenantId = getEffectiveTenantId(session);
    if (effectiveTenantId && contact.tenantId && contact.tenantId !== effectiveTenantId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, contact });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { apiKey, businessCard, timelineActivities, deals, quotes, documents, interactions, sourceRelationships, targetRelationships, ...cleanData } = body;

    const isDaemonAuthorized = apiKey === process.env.WHATSAPP_DAEMON_KEY || apiKey === 'coppergiant_daemon_secret_2026';
    const session = isDaemonAuthorized ? null : await getSession();

    if (!session && !isDaemonAuthorized) {
      return NextResponse.json({ success: false, error: 'Authentication required', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
    }

    const effectiveTenantId = getEffectiveTenantId(session);
    if (effectiveTenantId && existing.tenantId && existing.tenantId !== effectiveTenantId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (cleanData.leadScore !== undefined && typeof cleanData.leadScore === 'string') {
      cleanData.leadScore = parseInt(cleanData.leadScore, 10) || 50;
    }

    const updated = await prisma.contact.update({
      where: { id },
      data: {
        ...cleanData,
        updatedAt: new Date(),
      },
    });

    if (businessCard) {
      try {
        const existingCard = await prisma.businessCard.findFirst({
          where: { contactId: id },
          orderBy: { createdAt: 'desc' }
        });
        if (existingCard && businessCard.backImageUrl) {
          await prisma.businessCard.update({
            where: { id: existingCard.id },
            data: {
              backImageUrl: businessCard.backImageUrl.length > 2000 ? businessCard.backImageUrl.slice(0, 2000) : businessCard.backImageUrl,
            }
          });
        } else if (businessCard.frontImageUrl || businessCard.imageUrl) {
          const frontUrl = businessCard.frontImageUrl || businessCard.imageUrl;
          await prisma.businessCard.create({
            data: {
              contactId: id,
              frontImageUrl: frontUrl ? (frontUrl.length > 2000 ? frontUrl.slice(0, 2000) : frontUrl) : null,
              backImageUrl: businessCard.backImageUrl ? (businessCard.backImageUrl.length > 2000 ? businessCard.backImageUrl.slice(0, 2000) : businessCard.backImageUrl) : null,
              parsedData: JSON.stringify({ name: updated.name, title: updated.title, company: updated.company, email: updated.email, phone: updated.phone }),
              parsedDataJson: JSON.stringify({ name: updated.name, title: updated.title, company: updated.company, email: updated.email, phone: updated.phone }),
            },
          });
        }
      } catch (cardErr) {
        console.warn('Could not associate businessCard with updated contact:', cardErr);
      }
    }

    // Audit activity if stage or score changed
    if (cleanData.stage && cleanData.stage !== existing.stage) {
      await prisma.timelineActivity.create({
        data: {
          contactId: id,
          type: 'STAGE_CHANGE',
          title: `Etapa cambiada a: ${cleanData.stage}`,
          description: `Etapa previa: ${existing.stage}`,
        },
      });
    }

    if (cleanData.leadScore !== undefined && cleanData.leadScore !== existing.leadScore) {
      await prisma.timelineActivity.create({
        data: {
          contactId: id,
          type: 'SCORE_CHANGE',
          title: `Lead Score actualizado: ${cleanData.leadScore}`,
          description: `Puntaje anterior: ${existing.leadScore}`,
        },
      });
    }

    return NextResponse.json({ success: true, contact: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const { id } = await params;

    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
    }

    const effectiveTenantId = getEffectiveTenantId(session);
    if (effectiveTenantId && existing.tenantId && existing.tenantId !== effectiveTenantId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await prisma.$transaction([
      prisma.timelineActivity.deleteMany({ where: { contactId: id } }),
      prisma.deal.deleteMany({ where: { contactId: id } }),
      prisma.quote.deleteMany({ where: { contactId: id } }),
      prisma.document.deleteMany({ where: { contactId: id } }),
      prisma.interaction.deleteMany({ where: { contactId: id } }),
      prisma.relationship.deleteMany({ where: { sourceContactId: id } }),
      prisma.relationship.deleteMany({ where: { targetContactId: id } }),
      prisma.contact.delete({ where: { id } })
    ]);
    return NextResponse.json({ success: true, message: 'Contact and all associated data permanently purged.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

