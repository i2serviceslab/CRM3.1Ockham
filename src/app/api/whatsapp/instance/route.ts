/**
 * GET  /api/whatsapp/instance  – Get Olimpo WhatsApp instance status
 * POST /api/whatsapp/instance  – Actions: connect, disconnect, getQr
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as EvoApi from '@/lib/evolution-api';
import { COPPER_GIANT_TENANT_ID } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    if (!EvoApi.isConfigured()) {
      return NextResponse.json({ configured: false, message: 'EVOLUTION_API_URL not set' });
    }

    const tenantId = COPPER_GIANT_TENANT_ID;
    const instanceName = EvoApi.instanceNameFor();

    let session = await prisma.whatsAppSession.findFirst({
      where: { instanceName },
    });

    if (!session) {
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin}/api/whatsapp/webhook`;
      await EvoApi.createInstance(tenantId, webhookUrl);

      session = await prisma.whatsAppSession.create({
        data: {
          tenantId,
          instanceName,
          status: 'CONNECTING',
          qrCode: null,
          phoneNumber: null,
        },
      });
    }

    const evStatus = await EvoApi.getInstanceStatus(instanceName);

    const status =
      evStatus.state === 'open'
        ? 'CONNECTED'
        : evStatus.state === 'connecting'
        ? 'CONNECTING'
        : 'DISCONNECTED';

    if (session.status !== status || (evStatus.phoneNumber && session.phoneNumber !== evStatus.phoneNumber)) {
      session = await prisma.whatsAppSession.update({
        where: { id: session.id },
        data: {
          status,
          phoneNumber: evStatus.phoneNumber || session.phoneNumber,
          qrCode: status === 'CONNECTED' ? null : session.qrCode,
        },
      });
    }

    return NextResponse.json({
      configured: true,
      instanceName,
      status: session.status,
      phoneNumber: session.phoneNumber || evStatus.phoneNumber || null,
      qrCode: session.qrCode,
      serverState: evStatus.state,
    });
  } catch (error: any) {
    console.error('[/api/whatsapp/instance GET]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();
    const instanceName = EvoApi.instanceNameFor();

    if (action === 'getQr') {
      const qr = await EvoApi.getInstanceQr(instanceName);
      if (qr) {
        await prisma.whatsAppSession.updateMany({
          where: { instanceName },
          data: { qrCode: qr, status: 'QR_READY' },
        });
      }
      return NextResponse.json({ qrCode: qr });
    }

    if (action === 'disconnect') {
      await EvoApi.deleteInstance(instanceName);
      await prisma.whatsAppSession.updateMany({
        where: { instanceName },
        data: { status: 'DISCONNECTED', qrCode: null, phoneNumber: null },
      });
      return NextResponse.json({ success: true, status: 'DISCONNECTED' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('[/api/whatsapp/instance POST]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
