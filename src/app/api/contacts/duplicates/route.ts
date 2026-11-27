import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const contacts = await prisma.contact.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        whatsapp: true,
        company: true,
        stage: true,
        leadScore: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const emailGroups = new Map<string, typeof contacts>();
    const phoneGroups = new Map<string, typeof contacts>();
    const nameGroups = new Map<string, typeof contacts>();

    for (const c of contacts) {
      const email = (c.email || '').trim().toLowerCase();
      if (email && !email.includes('@whatsapp.crm') && !email.includes('@investor.com')) {
        const list = emailGroups.get(email) || [];
        list.push(c);
        emailGroups.set(email, list);
      }

      const digits = (c.whatsapp || c.phone || '').replace(/\D/g, '');
      if (digits.length >= 8) {
        const key = digits.slice(-10);
        const list = phoneGroups.get(key) || [];
        list.push(c);
        phoneGroups.set(key, list);
      }

      const nameKey = `${(c.name || '').trim().toLowerCase()}::${(c.company || '').trim().toLowerCase()}`;
      if ((c.name || '').trim().length > 2) {
        const list = nameGroups.get(nameKey) || [];
        list.push(c);
        nameGroups.set(nameKey, list);
      }
    }

    const seenPairs = new Set<string>();
    const duplicates: Array<{ reason: string; key: string; contacts: typeof contacts }> = [];

    const collect = (map: Map<string, typeof contacts>, reason: string) => {
      for (const [key, list] of map.entries()) {
        if (list.length < 2) continue;
        const pairSig = list
          .map((x) => x.id)
          .sort()
          .join('|');
        if (seenPairs.has(pairSig)) continue;
        seenPairs.add(pairSig);
        duplicates.push({ reason, key, contacts: list.slice(0, 5) });
      }
    };

    collect(emailGroups, 'Mismo Email');
    collect(phoneGroups, 'Mismo Teléfono / WhatsApp');
    collect(nameGroups, 'Mismo Nombre y Empresa');

    return NextResponse.json({
      success: true,
      count: duplicates.length,
      duplicates: duplicates.slice(0, 50),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
