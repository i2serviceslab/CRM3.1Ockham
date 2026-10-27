import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, getEffectiveTenantId } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const body = await request.json();
    const { contacts, tenantId: bodyTenantId } = body;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ success: false, error: 'Se requiere una lista de contactos válida' }, { status: 400 });
    }

    const effectiveTenantId = getEffectiveTenantId(session, bodyTenantId);

    let countCreated = 0;
    let countUpdated = 0;
    let countSkipped = 0;

    // High performance batch pre-fetch: 1 query instead of N individual queries
    const batchEmails = contacts
      .map((c: any) => (c.email || c.Email || '').trim().toLowerCase())
      .filter(Boolean);
    const batchPhones = contacts
      .map((c: any) => (c.phone || c.Telefono || c.Teléfono || '').trim())
      .filter(Boolean);

    const existingList = await prisma.contact.findMany({
      where: {
        tenantId: effectiveTenantId || null,
        OR: [
          ...(batchEmails.length ? [{ email: { in: batchEmails } }] : []),
          ...(batchPhones.length ? [{ phone: { in: batchPhones } }] : []),
        ],
      },
    });

    const emailMap = new Map<string, any>();
    const phoneMap = new Map<string, any>();
    for (const item of existingList) {
      if (item.email) emailMap.set(item.email.toLowerCase(), item);
      if (item.phone) phoneMap.set(item.phone, item);
    }

    for (const rawContact of contacts) {
      const name = (rawContact.name || rawContact.Nombre || '').trim();
      if (!name) {
        countSkipped++;
        continue;
      }

      const email = (rawContact.email || rawContact.Email || '').trim() || null;
      const phone = (rawContact.phone || rawContact.Telefono || rawContact.Teléfono || '').trim() || null;
      const company = (rawContact.company || rawContact.Empresa || '').trim() || null;
      const title = (rawContact.title || rawContact.Cargo || '').trim() || null;
      const whatsapp = (rawContact.whatsapp || rawContact.WhatsApp || phone || '').trim() || null;
      const location = (rawContact.location || rawContact.Ubicacion || rawContact.Ubicación || '').trim() || null;
      const stage = (rawContact.stage || rawContact.Etapa || 'Lead Prospect').trim();
      const investorType = (rawContact.investorType || rawContact.Tipo || 'Retail investor').trim();
      const source = (rawContact.source || rawContact.Fuente || 'Import').trim();
      const leadScore = rawContact.leadScore ? parseInt(rawContact.leadScore, 10) : 50;
      const tags = (rawContact.tags || '').trim();
      const notes = (rawContact.notes || '').trim();

      // Check map for existing contact in memory
      let existing = (email ? emailMap.get(email.toLowerCase()) : null) || (phone ? phoneMap.get(phone) : null);

      if (existing) {
        // Update existing contact
        const updated = await prisma.contact.update({
          where: { id: existing.id },
          data: {
            company: company || existing.company,
            title: title || existing.title,
            whatsapp: whatsapp || existing.whatsapp,
            location: location || existing.location,
            stage: stage || existing.stage,
            tags: tags ? (existing.tags ? `${existing.tags}, ${tags}` : tags) : existing.tags,
            notes: notes ? (existing.notes ? `${existing.notes}\n${notes}` : notes) : existing.notes,
            updatedAt: new Date(),
          },
        });
        if (email) emailMap.set(email.toLowerCase(), updated);
        if (phone) phoneMap.set(phone, updated);
        countUpdated++;
      } else {
        // Create new contact
        const created = await prisma.contact.create({
          data: {
            tenantId: effectiveTenantId || null,
            name,
            company,
            title,
            email,
            phone,
            whatsapp,
            location,
            investorType,
            stage,
            source,
            leadScore,
            tags: tags || undefined,
            notes: notes || undefined,
            timelineActivities: {
              create: {
                type: 'NOTE',
                title: 'Contacto Importado en Lote',
                description: `Importado desde migración maestra (Fuente: ${source}).`,
              },
            },
          },
        });
        if (email) emailMap.set(email.toLowerCase(), created);
        if (phone) phoneMap.set(phone, created);
        countCreated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Proceso completado: ${countCreated} creados, ${countUpdated} actualizados, ${countSkipped} omitidos.`,
      stats: { countCreated, countUpdated, countSkipped, totalProcessed: contacts.length },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
