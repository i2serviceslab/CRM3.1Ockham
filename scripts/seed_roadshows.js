const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("[Auto-Seed] Seeding initial roadshows...");
  
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'coppergiant-silver' } }) || await prisma.tenant.findFirst();
  const tenantId = tenant ? tenant.id : null;

  const events = [
    { name: 'Arcstone Toronto', city: 'Toronto', country: 'Canada', dates: 'September 16, 2026', boothNumber: 'TBD', tenantId },
    { name: 'Top Shelf Arizona Conference', city: 'Arizona', country: 'USA', dates: 'September 18-20, 2026', boothNumber: 'TBD', tenantId },
    { name: 'Ignite HK', city: 'Hong Kong', country: 'China', dates: 'October 14-15, 2026', boothNumber: 'TBD', tenantId },
    { name: 'PDAC 2026 International Convention', city: 'Toronto', country: 'Canadá', dates: '01 - 04 de Marzo, 2026', boothNumber: 'Metro Toronto Convention Centre - Stand #2408', tenantId },
    { name: 'Beaver Creek Precious Metals Summit', city: 'Beaver Creek, Colorado', country: 'EE. UU.', dates: '15 - 18 de Septiembre, 2026', boothNumber: 'Park Hyatt Beaver Creek - Tabla #14', tenantId }
  ];

  for (const ev of events) {
    const existing = await prisma.roadshowEvent.findFirst({ where: { name: ev.name } });
    if (!existing) {
      await prisma.roadshowEvent.create({ data: ev });
      console.log(`[Auto-Seed] Created event: ${ev.name}`);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
