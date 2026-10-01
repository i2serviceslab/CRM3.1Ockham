import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    const folder = await prisma.mediaFolder.findFirst({
      where: { name: 'Actas de Reuniones', tenantId: tenantId || null }
    });

    if (!folder) {
      return NextResponse.json({ success: true, history: [] });
    }

    const files = await prisma.mediaFile.findMany({
      where: { folderId: folder.id, tenantId: tenantId || null },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, history: files });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
