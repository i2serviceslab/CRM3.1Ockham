import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { COPPER_GIANT_TENANT_ID } from '@/lib/auth';

function formatToIsoCompact(date: Date): string {
  return date.toISOString().replace(/-|:|\.\d+/g, '');
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');

    const where: any = {};
    if (contactId) {
      where.contactId = contactId;
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json({ success: true, events });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, startTime, endTime, location, meetingUrl, contactId, attendees } = body;

    if (!title || !startTime) {
      return NextResponse.json({ success: false, error: 'Title and Start Time are required' }, { status: 400 });
    }

    const startDate = new Date(startTime);
    const endDate = endTime ? new Date(endTime) : new Date(startDate.getTime() + 60 * 60 * 1000);

    const event = await prisma.calendarEvent.create({
      data: {
        tenantId: COPPER_GIANT_TENANT_ID,
        contactId: contactId || null,
        title: title.trim(),
        description: description || null,
        startTime: startDate,
        endTime: endDate,
        location: location || 'Jitsi IR Video Room',
        meetingUrl: meetingUrl || `https://meet.jit.si/CopperGiant-IR-${Date.now().toString().slice(-6)}`,
        syncSource: 'MANUAL',
        attendees: attendees || '',
      },
      include: {
        contact: true,
      },
    });

    const startIso = formatToIsoCompact(startDate);
    const endIso = formatToIsoCompact(endDate);
    const encodedTitle = encodeURIComponent(title);
    const encodedDetails = encodeURIComponent(`${description || ''}\n\nMeeting Link: ${event.meetingUrl}`);
    const encodedLocation = encodeURIComponent(event.location || '');

    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodedTitle}&dates=${startIso}/${endIso}&details=${encodedDetails}&location=${encodedLocation}`;
    const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodedTitle}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${encodedDetails}&location=${encodedLocation}`;

    const icsContent =
      `BEGIN:VCALENDAR\n` +
      `VERSION:2.0\n` +
      `PRODID:-//Copper Giant Resources Corp.//Calendar Sync//EN\n` +
      `BEGIN:VEVENT\n` +
      `UID:${event.id}@coppergiant.com\n` +
      `DTSTAMP:${formatToIsoCompact(new Date())}\n` +
      `DTSTART:${startIso}\n` +
      `DTEND:${endIso}\n` +
      `SUMMARY:${title}\n` +
      `DESCRIPTION:${description || ''} - Link: ${event.meetingUrl}\n` +
      `LOCATION:${event.location || ''}\n` +
      `END:VEVENT\n` +
      `END:VCALENDAR`;

    return NextResponse.json({
      success: true,
      event,
      syncLinks: {
        googleUrl,
        outlookUrl,
        icsContent,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
