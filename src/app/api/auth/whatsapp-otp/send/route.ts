import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendText, instanceNameFor } from '@/lib/evolution-api';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;

    if (cleanPhone.length < 7) {
      return NextResponse.json({ success: false, error: 'Invalid phone number format' }, { status: 400 });
    }

    // Generate 6-digit numeric OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

    // Lookup pre-registered user strictly or self-heal authorized executives
    const AUTHORIZED_EXECUTIVES: Record<string, { name: string; email: string; role: string }> = {
      '573207116676': { name: 'Nelson Carvajal', email: 'carvajal@i2services.co', role: 'SUPER_ADMIN' },
      '13039562944': { name: 'Ian Harris', email: 'ian@coppergiant.com', role: 'SUPER_ADMIN' },
      '573044223098': { name: 'Andrés', email: 'andres@i2services.co', role: 'TENANT_ADMIN' },
      '573012954278': { name: 'Sara', email: 'sara@coppergiant.com', role: 'MANAGER' },
    };

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: formattedPhone },
          { phone: cleanPhone },
          { phone: { contains: cleanPhone.slice(-10) } },
        ],
      },
    });

    if (!user) {
      const execKey = Object.keys(AUTHORIZED_EXECUTIVES).find(
        (k) => cleanPhone === k || cleanPhone.endsWith(k.slice(-10))
      );

      if (execKey) {
        const execInfo = AUTHORIZED_EXECUTIVES[execKey];
        const existingByEmail = await prisma.user.findFirst({
          where: {
            OR: [
              { email: execInfo.email },
              { name: execInfo.name },
            ],
          },
        });

        if (existingByEmail) {
          user = await prisma.user.update({
            where: { id: existingByEmail.id },
            data: {
              phone: formattedPhone,
              name: execInfo.name,
              email: execInfo.email,
              role: execInfo.role,
            },
          });
        } else {
          user = await prisma.user.create({
            data: {
              phone: formattedPhone,
              name: execInfo.name,
              email: execInfo.email,
              role: execInfo.role,
            },
          });
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Acceso no autorizado. El número de celular no está registrado en la plataforma. Contacta al administrador para solicitar acceso.',
        },
        { status: 403 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode,
        otpExpiresAt,
      },
    });

    // Send OTP message via WhatsApp DB & Evolution API Olimpo
    const otpMessageText =
      `🔑 *Copper Giant CRM Security Verification Code*\n\n` +
      `Your single-use login code is: *${otpCode}*\n\n` +
      `⏱️ *Valid for 5 minutes*. Please do not share this code with anyone.\n\n` +
      `— 🪽 Hermes (Security Daemon)`;

    await prisma.whatsAppMessage.create({
      data: {
        fromNumber: 'CRM Bot',
        senderName: 'Hermes Security Daemon',
        toNumber: user.phone,
        message: otpMessageText,
        direction: 'OUTBOUND',
      },
    });

    // Dispatch directly through Evolution API (olimpus instance)
    try {
      await sendText(instanceNameFor(), user.phone, otpMessageText);
    } catch (e: any) {
      console.warn('[OTP Dispatch Note]:', e?.message);
    }

    return NextResponse.json({
      success: true,
      message: `Código de verificación de 6 dígitos enviado por WhatsApp a ${user.phone}`,
      expiresInSeconds: 300,
      ...(process.env.NODE_ENV === 'development' ? { devPreviewCode: otpCode } : {}),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
