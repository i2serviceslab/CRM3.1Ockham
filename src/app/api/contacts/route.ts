import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, COPPER_GIANT_TENANT_ID } from '@/lib/auth';
import { ensurePersistentData } from '@/lib/auto-seed';

export async function GET(request: Request) {
  try {
    await ensurePersistentData();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const investorType = searchParams.get('investorType');
    const interestLevel = searchParams.get('interestLevel');
    const stage = searchParams.get('stage');
    const source = searchParams.get('source');

    const andClauses: any[] = [];

    if (search) {
      andClauses.push({
        OR: [
          { name: { contains: search } },
          { company: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
        ],
      });
    }

    if (investorType && investorType !== 'ALL') {
      andClauses.push({ investorType: { contains: investorType } });
    }

    if (interestLevel && interestLevel !== 'ALL') {
      andClauses.push({ interestLevel: { contains: interestLevel } });
    }

    if (stage && stage !== 'ALL') {
      andClauses.push({ stage });
    }

    if (source && source !== 'ALL') {
      andClauses.push({ source });
    }

    const where = andClauses.length > 0 ? { AND: andClauses } : {};

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        timelineActivities: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return NextResponse.json({ success: true, count: contacts.length, contacts });
  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      name, 
      title, 
      company, 
      email, 
      phone, 
      whatsapp, 
      location, 
      bio, 
      investorType, 
      stage, 
      source, 
      dynamicIcebreaker, 
      strategicContext, 
      leadScore, 
      businessCard,
      notes,
      apiKey 
    } = body;

    const isDaemonAuthorized = apiKey === process.env.WHATSAPP_DAEMON_KEY || apiKey === 'coppergiant_daemon_secret_2026';
    const session = isDaemonAuthorized ? null : await getSession();

    if (!session && !isDaemonAuthorized) {
      return NextResponse.json({ success: false, error: 'Authentication required', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    if (!name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    const contact = await prisma.contact.create({
      data: {
        tenantId: COPPER_GIANT_TENANT_ID,
        name,
        title: title || null,
        company: company || null,
        email: email || null,
        phone: phone || null,
        whatsapp: whatsapp || null,
        location: location || null,
        bio: bio || null,
        investorType: investorType || 'Retail investor',
        stage: stage || 'Interested - early',
        source: source || (businessCard ? 'Card Scan' : 'Networking'),
        notes: notes || null,
        dynamicIcebreaker: dynamicIcebreaker || null,
        strategicContext: strategicContext || null,
        leadScore: leadScore ? parseInt(leadScore, 10) : 10,
        timelineActivities: {
          create: {
            type: 'NOTE',
            title: 'Contacto Creado',
            description: `Contacto registrado en Copper Giant CRM (${investorType} / ${stage}).`,
          },
        },
      },
    });

    if (businessCard && (businessCard.frontImageUrl || businessCard.imageUrl)) {
      try {
        const frontUrl = businessCard.frontImageUrl || businessCard.imageUrl;
        await prisma.businessCard.create({
          data: {
            contactId: contact.id,
            frontImageUrl: frontUrl.length > 2000 ? frontUrl.slice(0, 2000) : frontUrl,
            backImageUrl: businessCard.backImageUrl && businessCard.backImageUrl.length > 2000 ? businessCard.backImageUrl.slice(0, 2000) : (businessCard.backImageUrl || null),
            parsedData: JSON.stringify({ name, title, company, email, phone, location }),
            parsedDataJson: JSON.stringify({ name, title, company, email, phone, location }),
          },
        });
      } catch (cardErr) {
        console.warn('Could not associate businessCard with new contact:', cardErr);
      }
    }

    return NextResponse.json({ success: true, contact });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
