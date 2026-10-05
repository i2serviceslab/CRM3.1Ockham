import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { fileId, title, summary, actionItems, aiDoctrines, transcript } = body;

    if (!fileId) {
      return NextResponse.json({ success: false, error: 'No fileId provided' }, { status: 400 });
    }

    const newJson = JSON.stringify({
      transcript,
      summary,
      actionItems,
      aiDoctrines
    });

    const safeTitle = title.endsWith('.json') ? title : `${title}.json`;

    await prisma.mediaFile.update({
      where: { id: fileId },
      data: {
        name: safeTitle,
        originalName: safeTitle,
        aiSummary: newJson
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
