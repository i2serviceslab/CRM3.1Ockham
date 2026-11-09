import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole, COPPER_GIANT_TENANT_ID } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    const where: any = {};
    if (role && role !== 'ALL') {
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!requireRole(session, 'SUPER_ADMIN', 'TENANT_ADMIN')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, userId, name, email, phone, role } = body;

    // Delete User
    if (action === 'DELETE' && userId) {
      await prisma.user.delete({ where: { id: userId } });
      return NextResponse.json({ success: true, message: 'User successfully removed' });
    }

    const cleanEmail = email ? email.trim().toLowerCase() : null;
    let formattedPhone = phone ? phone.replace(/\D/g, '') : null;
    if (formattedPhone) {
      formattedPhone = formattedPhone.startsWith('+') ? formattedPhone : `+${formattedPhone}`;
    } else {
      formattedPhone = `+57${Date.now().toString().slice(-10)}`;
    }

    let user;
    if (userId) {
      user = await prisma.user.update({
        where: { id: userId },
        data: {
          name: name || undefined,
          email: cleanEmail || undefined,
          phone: formattedPhone,
          role: role || 'AGENT',
          tenantId: COPPER_GIANT_TENANT_ID,
        },
      });
    } else {
      let existingUser = null;
      if (cleanEmail) {
        existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
      }
      if (!existingUser && formattedPhone) {
        existingUser = await prisma.user.findFirst({ where: { phone: formattedPhone } });
      }

      if (existingUser) {
        user = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: name || existingUser.name,
            email: cleanEmail || existingUser.email,
            phone: formattedPhone || existingUser.phone,
            role: role || existingUser.role,
            tenantId: COPPER_GIANT_TENANT_ID,
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            phone: formattedPhone,
            name: name || (cleanEmail ? cleanEmail.split('@')[0].toUpperCase() : `User ${formattedPhone.slice(-4)}`),
            email: cleanEmail || `${Date.now()}@investor.com`,
            role: role || 'AGENT',
            tenantId: COPPER_GIANT_TENANT_ID,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `User ${user.name} (${user.phone}) saved successfully with role ${user.role}!`,
      user,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
