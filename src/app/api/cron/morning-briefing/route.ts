import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { enqueueWhatsAppMessage } from '@/lib/whatsapp-queue';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace('Bearer ', '');
    const isCron = Boolean(process.env.CRON_SECRET && authHeader === process.env.CRON_SECRET);
    const session = isCron ? null : await getSession();

    if (!isCron && !requireRole(session, 'SUPER_ADMIN', 'TENANT_ADMIN')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [todayEvents, pendingTasks, recentContacts, admins] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: { startTime: { gte: startOfDay, lt: endOfDay } },
        orderBy: { startTime: 'asc' },
        take: 10,
      }),
      prisma.task.findMany({
        where: { status: { not: 'COMPLETED' } },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      prisma.contact.count({
        where: { createdAt: { gte: last24h } },
      }),
      prisma.user.findMany({
        where: { role: { in: ['SUPER_ADMIN', 'TENANT_ADMIN'] } },
        select: { phone: true, name: true },
      }),
    ]);

    const lines = [
      `☀️ *Briefing Matutino — Copper Giant CRM*`,
      `• Contactos nuevos (24h): *${recentContacts}*`,
      `• Reuniones hoy: *${todayEvents.length}*`,
      `• Tareas pendientes: *${pendingTasks.length}*`,
    ];

    if (todayEvents.length > 0) {
      lines.push('', '*Agenda de hoy:*');
      todayEvents.slice(0, 4).forEach((e) => {
        lines.push(`- ${e.title} (${new Date(e.startTime).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })})`);
      });
    }

    const text = lines.join('\n');
    const recipients = admins.map((a) => a.phone).filter(Boolean);
    for (const phone of recipients) {
      enqueueWhatsAppMessage({ to: phone, text, senderName: 'Briefing Matutino' });
    }

    return NextResponse.json({
      success: true,
      recipientsCount: recipients.length,
      summary: { todayEvents: todayEvents.length, pendingTasks: pendingTasks.length, recentContacts },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
