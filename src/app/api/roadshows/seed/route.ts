import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const tenant = await prisma.tenant.findFirst();
    const tenantId = tenant ? tenant.id : null;

    const events = [
      { name: 'Arcstone Toronto', city: 'Toronto', country: 'Canada', dates: 'September 16, 2026', boothNumber: 'TBD', tenantId },
      { name: 'Top Shelf Arizona Conference', city: 'Arizona', country: 'USA', dates: 'September 18–20, 2026', boothNumber: 'TBD', tenantId },
      { name: 'Ignite HK', city: 'Hong Kong', country: '', dates: 'October 14–15, 2026', boothNumber: 'TBD', tenantId },
      { name: 'One Capital Bahamas', city: 'Bahamas', country: '', dates: 'October 19–21, 2026', boothNumber: 'TBD', tenantId },
      { name: 'Luxnri Forum', city: 'Luxembourg', country: '', dates: 'November 6, 2026', boothNumber: 'TBD', tenantId },
      { name: 'MKK Conference Munich', city: 'Munich', country: 'Germany', dates: 'November 11–12, 2026', boothNumber: 'TBD', tenantId },
      { name: 'Deutsche Goldmesse', city: 'Frankfurt', country: 'Germany', dates: 'November 13–14, 2026', boothNumber: 'TBD', tenantId },
      { name: 'Europe Road Show', city: 'Zurich', country: 'Paris', dates: 'November 16–19, 2026', boothNumber: 'TBD', tenantId },
      { name: '121 London', city: 'London', country: 'UK', dates: 'November 23–24, 2026', boothNumber: 'TBD', tenantId },
      { name: '121 Dubai', city: 'Dubai', country: 'UAE', dates: 'November 26–27, 2026', boothNumber: 'TBD', tenantId },
      { name: 'PDAC 2026 International Convention', city: 'Toronto', country: 'Canadá', dates: '01 - 04 de Marzo, 2026', boothNumber: 'Metro Toronto Convention Centre - Stand #2408', tenantId },
      { name: 'Beaver Creek Precious Metals Summit', city: 'Beaver Creek, Colorado', country: 'EE. UU.', dates: '15 - 18 de Septiembre, 2026', boothNumber: 'Park Hyatt Beaver Creek - Tabla #14', tenantId }
    ];

    let created = 0;
    for (const ev of events) {
      const existing = await prisma.roadshowEvent.findFirst({ where: { name: ev.name } });
      if (!existing) {
        await prisma.roadshowEvent.create({ data: ev });
        created++;
      }
    }
    return NextResponse.json({ success: true, created, total: events.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
