import { prisma } from '@/lib/prisma';
import { COPPER_GIANT_TENANT_ID } from '@/lib/auth';

let isSeeding = false;
let isInitialized = false;

/**
 * Self-healing automatic data persistence synchronizer for Copper Giant Resources Corp.
 * Single Tenant - All multi-tenant overhead completely removed.
 */
export async function ensurePersistentData() {
  if (isInitialized || isSeeding) return;
  isSeeding = true;

  try {
    const tenantId = COPPER_GIANT_TENANT_ID;

    // 1. Ensure Single Unified Tenant (Copper Giant)
    let tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      try {
        tenant = await prisma.tenant.upsert({
          where: { slug: 'coppergiant' },
          update: {
            name: 'Copper Giant Resources Corp.',
            slug: 'coppergiant',
            primaryColor: '#E65100',
            status: 'ACTIVE',
          },
          create: {
            id: tenantId,
            name: 'Copper Giant Resources Corp.',
            slug: 'coppergiant',
            primaryColor: '#E65100',
            status: 'ACTIVE',
          },
        });
      } catch (e) {
        tenant = await prisma.tenant.findFirst({ where: { slug: 'coppergiant' } });
      }
    }

    // 2. Ensure Real Executive Users in DB (for WhatsApp OTP login)
    const executiveUsers = [
      {
        phone: '+573207116676',
        name: 'Nelson Carvajal',
        email: 'carvajal@i2services.co',
        role: 'SUPER_ADMIN',
      },
      {
        phone: '+13039562944',
        name: 'Ian Harris',
        email: 'ian@coppergiant.com',
        role: 'SUPER_ADMIN',
      },
      {
        phone: '+573044223098',
        name: 'Andrés',
        email: 'andres@i2services.co',
        role: 'TENANT_ADMIN',
      },
      {
        phone: '+573012954278',
        name: 'Sara',
        email: 'sara@coppergiant.com',
        role: 'MANAGER',
      },
    ];

    for (const u of executiveUsers) {
      await prisma.user.upsert({
        where: { phone: u.phone },
        update: {
          name: u.name,
          email: u.email,
          role: u.role,
          tenantId,
        },
        create: {
          phone: u.phone,
          name: u.name,
          email: u.email,
          role: u.role,
          tenantId,
        },
      });
    }

    // 3. Ensure WhatsApp Session is Connected via Olimpo
    const session = await prisma.whatsAppSession.findFirst({
      where: { instanceName: 'olimpus' },
    });

    if (!session) {
      try {
        await prisma.whatsAppSession.create({
          data: {
            tenantId,
            instanceName: 'olimpus',
            status: 'CONNECTED',
            phoneNumber: '+573207116676',
            qrCode: null,
          },
        });
      } catch (e) {
        // Ignored if created concurrently
      }
    }

    // 4. Ensure Full WhatsApp Whitelist
    const whitelistEntries = [
      { phoneNumber: '+573137873131', name: 'Nelson (Línea Nueva)', role: 'Admin' },
      { phoneNumber: '+573207116676', name: 'Nelson', role: 'Admin' },
      { phoneNumber: '+573012954278', name: 'Sara', role: 'Admin' },
      { phoneNumber: '+573044223098', name: 'Andrés', role: 'Admin' },
      { phoneNumber: '+573124031892', name: 'Administrador WhatsApp', role: 'Admin' },
      { phoneNumber: '63260657213511', name: 'Nelson', role: 'Admin' },
      { phoneNumber: '149684358279226', name: 'Sara', role: 'Admin' },
      { phoneNumber: '125937114960119', name: 'Andrés', role: 'Admin' },
    ];

    for (const entry of whitelistEntries) {
      await prisma.whatsAppWhitelist.upsert({
        where: { phoneNumber: entry.phoneNumber },
        update: { name: entry.name, role: entry.role, isActive: true, tenantId },
        create: { phoneNumber: entry.phoneNumber, name: entry.name, role: entry.role, isActive: true, tenantId },
      });
    }

    // 5. Ensure Olimpo Gateway Configuration (WhatsApp Native, No Telegram Bot tokens)
    const hermesConfig = await prisma.hermesConfig.findFirst();
    if (!hermesConfig) {
      await prisma.hermesConfig.create({
        data: {
          tenantId,
          endpointUrl: 'http://127.0.0.1:18789',
          apiKey: 'olimpus_coppergiant_2026',
          gatewayMode: 'WHATSAPP',
          isActive: true,
        },
      });
    } else {
      await prisma.hermesConfig.update({
        where: { id: hermesConfig.id },
        data: {
          gatewayMode: 'WHATSAPP',
          endpointUrl: 'http://127.0.0.1:18789',
          isActive: true,
        },
      });
    }

    // 6. Ensure Institutional Media Drive Folders
    const institutionalFolders = [
      { name: 'Presentaciones Corporativas & Pitch Decks', color: '#E65100', description: 'Decks corporativos y materiales de IR' },
      { name: 'Reportes Técnicos & NI 43-101', color: '#00E5FF', description: 'Estudios geológicos y recursos minerales de Mocoa' },
      { name: 'Doctrina y Memoria del Olimpo', color: '#FF002C', description: 'Directivas y directrices estratégicas de los agentes' },
      { name: 'Pórfido Mocoa Cu-Mo', color: '#10B981', description: 'Mapas, barrenos y modelos de bloques' },
    ];

    for (const f of institutionalFolders) {
      const existing = await prisma.mediaFolder.findFirst({ where: { name: f.name } });
      if (!existing) {
        await prisma.mediaFolder.create({
          data: {
            name: f.name,
            color: f.color,
            description: f.description,
            isSystem: true,
            tenantId,
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
