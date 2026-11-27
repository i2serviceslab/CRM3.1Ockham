import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!requireRole(session, 'SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { primaryId, secondaryId } = body;
    if (!primaryId || !secondaryId || primaryId === secondaryId) {
      return NextResponse.json({ success: false, error: 'Se requieren dos IDs distintos' }, { status: 400 });
    }

    const [primary, secondary] = await Promise.all([
      prisma.contact.findUnique({ where: { id: primaryId } }),
      prisma.contact.findUnique({ where: { id: secondaryId } }),
    ]);

    if (!primary || !secondary) {
      return NextResponse.json({ success: false, error: 'Contacto no encontrado' }, { status: 404 });
    }

    const merged = await prisma.$transaction(async (tx) => {
      await tx.timelineActivity.updateMany({ where: { contactId: secondaryId }, data: { contactId: primaryId } });
      await tx.interaction.updateMany({ where: { contactId: secondaryId }, data: { contactId: primaryId } });
      await tx.document.updateMany({ where: { contactId: secondaryId }, data: { contactId: primaryId } });
      await tx.task.updateMany({ where: { contactId: secondaryId }, data: { contactId: primaryId } });
      await tx.deal.updateMany({ where: { contactId: secondaryId }, data: { contactId: primaryId } });
      await tx.quote.updateMany({ where: { contactId: secondaryId }, data: { contactId: primaryId } });
      await tx.businessCard.updateMany({ where: { contactId: secondaryId }, data: { contactId: primaryId } });
      await tx.voiceNote.updateMany({ where: { contactId: secondaryId }, data: { contactId: primaryId } });

      const updatedPrimary = await tx.contact.update({
        where: { id: primaryId },
        data: {
          email: primary.email || secondary.email,
          phone: primary.phone || secondary.phone,
          whatsapp: primary.whatsapp || secondary.whatsapp,
          company: primary.company || secondary.company,
          title: primary.title || secondary.title,
          location: primary.location || secondary.location,
          linkedin: primary.linkedin || secondary.linkedin,
          notes: [primary.notes, secondary.notes].filter(Boolean).join('\n---\n') || null,
          leadScore: Math.max(primary.leadScore || 0, secondary.leadScore || 0),
        },
      });

      await tx.timelineActivity.create({
        data: {
          contactId: primaryId,
          type: 'MERGE',
          title: `Contacto fusionado: ${secondary.name}`,
          description: `Se consolidó el registro duplicado (${secondary.email || secondary.phone || secondary.id}) en ${primary.name}.`,
        },
      });

      await tx.contact.delete({ where: { id: secondaryId } });
      return updatedPrimary;
    });

    return NextResponse.json({ success: true, contact: merged });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
