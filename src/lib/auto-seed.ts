import { prisma } from '@/lib/prisma';

let isSeeding = false;
let isInitialized = false;

/**
 * Self-healing automatic data persistence synchronizer
 * Guarantees that essential configurations, whitelist, contacts, and tokens
 * are never lost across EasyPanel container rebuilds.
 */
export async function ensurePersistentData() {
  if (isInitialized || isSeeding) return;
  isSeeding = true;

  try {
    // 1. Ensure Default Tenant
    let tenant = await prisma.tenant.findFirst({
      where: { OR: [{ slug: 'coppergiant' }, { name: 'Copper Giant' }] },
    });

    if (!tenant) {
      try {
        tenant = await prisma.tenant.upsert({
          where: { slug: 'coppergiant' },
          update: {},
          create: {
            name: 'Copper Giant',
            slug: 'coppergiant',
            primaryColor: '#E65100',
            status: 'ACTIVE',
          },
        });
      } catch (e) {
        tenant = await prisma.tenant.findFirst({
          where: { slug: 'coppergiant' },
        });
      }
    }

    const tenantId = tenant?.id || '';

    // 2. Ensure WhatsApp Session is Connected
    const session = await prisma.whatsAppSession.findFirst({
      where: { OR: [{ tenantId }, { instanceName: 'Copper GiantBot' }] },
    });

    if (!session) {
      try {
        await prisma.whatsAppSession.create({
          data: {
            tenantId,
            instanceName: 'Copper GiantBot',
            status: 'CONNECTED',
            phoneNumber: '+573124031892',
            qrCode: null,
          },
        });
      } catch (e) {
        // Ignored if created by another worker
      }
    }

    // 3. Ensure Full WhatsApp Whitelist
    const whitelistEntries = [
      { phoneNumber: '+573137873131', name: 'Nelson (Línea Nueva)', role: 'Admin' },
      { phoneNumber: '+573207116676', name: 'Nelson', role: 'Admin' },
      { phoneNumber: '+573012954278', name: 'Sara', role: 'Admin' },
      { phoneNumber: '+573124031892', name: 'Administrador WhatsApp', role: 'Admin' },
      { phoneNumber: '63260657213511', name: 'Nelson', role: 'Admin' },
      { phoneNumber: '149684358279226', name: 'Sara', role: 'Admin' },
    ];

    for (const entry of whitelistEntries) {
      await prisma.whatsAppWhitelist.upsert({
        where: { phoneNumber: entry.phoneNumber },
        update: { name: entry.name, role: entry.role, isActive: true, tenantId },
        create: { phoneNumber: entry.phoneNumber, name: entry.name, role: entry.role, isActive: true, tenantId },
      });
    }

    // 4. Ensure CopperMind Gateway Configuration
    const copperMindConfig = await prisma.hermesConfig.findFirst({
      where: { OR: [{ tenantId }, { gatewayMode: 'TELEGRAM' }] },
    });

    if (!copperMindConfig) {
      await prisma.hermesConfig.create({
        data: {
          tenantId,
          endpointUrl: 'http://localhost:8000',
          apiKey: 'hermes_coppergiant_secret_2026',
          telegramBotToken: '8925340221:AAHU0nrxvP2XqPewfZMK1GzmjjyFGPIUX8o',
          telegramChatId: '-5370719843',
          gatewayMode: 'TELEGRAM',
          isActive: true,
        },
      });
    } else {
      await prisma.hermesConfig.update({
        where: { id: copperMindConfig.id },
        data: {
          telegramBotToken: '8925340221:AAHU0nrxvP2XqPewfZMK1GzmjjyFGPIUX8o',
          telegramChatId: '-5370719843',
          gatewayMode: 'TELEGRAM',
          isActive: true,
        },
      });
    }

    // 5. Ensure Key Contacts
    const keyContacts = [
      {
        name: 'Guillermo Flores',
        company: 'Banco Popular',
        title: 'Gerente Banca Corporativa',
        email: 'guillermo@bancopopular.com',
        phone: '+57 301 295 4278',
        whatsapp: '+573012954278',
        stage: 'Follow-up Required',
        leadScore: 85,
        investorType: 'Institutional Investor',
        dynamicIcebreaker: 'Contacto clave de banca corporativa en Banco Popular.',
      },
      {
        name: 'Ian Harris',
        company: 'Copper Giant',
        title: 'CEO & Mining Executive',
        email: 'ian@coppergiant.com',
        phone: '+1 303 956-2944',
        whatsapp: '+13039562944',
        stage: 'Deal Committed',
        leadScore: 95,
        investorType: 'Strategic Corporate',
        dynamicIcebreaker: 'Ejecutivo minero estratégico para exploraciones.',
      },
      {
        name: 'Felipe Olaya',
        company: 'BBVA',
        title: 'Director de Inversiones',
        email: 'felipe@bbva.com',
        phone: '+149684358279226',
        whatsapp: '+149684358279226',
        stage: 'Meeting Scheduled',
        leadScore: 78,
        investorType: 'Institutional Investor',
      },
      {
        name: 'Andrés',
        company: 'I2services',
        title: 'Tech Director',
        email: 'andres@i2services.co',
        phone: '+63260657213511',
        whatsapp: '+63260657213511',
        stage: 'Strategic Partner',
        leadScore: 90,
        investorType: 'Strategic Corporate',
      },
      {
        name: 'Patricia Gomez',
        company: 'Pan American Silver Corp',
        title: 'VP Business Development',
        email: 'pgomez@panamericansilver.com',
        phone: '+1 604 555 8890',
        whatsapp: '+16045558890',
        stage: 'Deck Sent',
        leadScore: 82,
        investorType: 'HNW investor',
      },
      {
        name: 'Scott Kelly',
        company: 'Wetherby Growth',
        title: 'Portfolio Manager',
        email: 'skelly@wetherbygrowth.com',
        phone: '+1-416-998-4714',
        whatsapp: '+14169984714',
        location: '217 Queen Street West, 4th Floor, Toronto ON M5V 0R2, Canada',
        city: 'Toronto',
        country: 'Canada',
        source: 'Card Scan',
        notes: 'Website: https://wetherbygrowth.com | Address: 217 Queen Street West, 4th Floor, Toronto ON M5V 0R2',
        stage: 'Interested - early',
        leadScore: 85,
        investorType: 'Institutional Investor',
        dynamicIcebreaker: 'Portfolio Manager en Wetherby Growth (Toronto). Interés estratégico en proyectos de pórfidos Cu-Mo como Mocoa.',
      },
    ];

    for (const c of keyContacts) {
      const existing = await prisma.contact.findFirst({
        where: { name: c.name },
      });

      if (!existing) {
        await prisma.contact.create({
          data: {
            tenantId,
            name: c.name,
            company: c.company,
            title: c.title,
            email: c.email,
            phone: c.phone,
            whatsapp: c.whatsapp,
            location: (c as any).location || null,
            city: (c as any).city || null,
            country: (c as any).country || 'Colombia',
            notes: (c as any).notes || null,
            stage: c.stage,
            leadScore: c.leadScore,
            investorType: c.investorType,
            dynamicIcebreaker: c.dynamicIcebreaker || '',
            strategicContext: 'Contacto persistido en CRM.',
            source: (c as any).source || 'System Permanent Registry',
          },
        });
      }
    }
    isInitialized = true;
  } catch (err: any) {
    console.error('[Auto-Seed] Error ensuring persistent data:', err?.message);
  } finally {
    isSeeding = false;
  }
}
