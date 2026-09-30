import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(request: Request, context: { params: any }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    
    const { id: eventId } = await context.params;
    const body = await request.json();
    const { contactId, time, topic, status } = body;

    const meeting = await prisma.summitMeeting.create({
      data: {
        eventId,
        contactId,
        time,
        topic,
        status: status || 'Programada'
      },
      include: { contact: true }
    });

    return NextResponse.json({ success: true, meeting });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
