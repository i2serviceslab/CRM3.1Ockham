import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Trackable share link for Media Drive files (?contactId=...).
 * Logs a DOCUMENT_VIEW timeline activity when opened by a contact, then redirects to the file.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');

    const file = await prisma.mediaFile.findUnique({ where: { id } });
    if (!file) {
      return NextResponse.json({ success: false, error: 'Archivo no encontrado' }, { status: 404 });
    }

    if (contactId) {
      await prisma.timelineActivity
        .create({
          data: {
            contactId,
            type: 'DOCUMENT_VIEW',
            title: `Abrió documento: ${file.name}`,
            description: `Visualizó enlace rastreable de Media Drive (${file.originalName}).`,
          },
        })
        .catch(() => {});
    }

    const targetUrl = file.url.startsWith('http') ? file.url : new URL(file.url, request.url).toString();
    return NextResponse.redirect(targetUrl);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
