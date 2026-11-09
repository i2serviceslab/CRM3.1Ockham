import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { COPPER_GIANT_TENANT_ID } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');
    const search = searchParams.get('search');
    const category = searchParams.get('category');

    const fileWhere: any = {};

    if (folderId && folderId !== 'root') {
      fileWhere.folderId = folderId;
    }

    if (search) {
      fileWhere.OR = [
        { name: { contains: search } },
        { originalName: { contains: search } },
        { aiSummary: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    if (category && category !== 'ALL') {
      fileWhere.aiCategory = category;
    }

    let folders = await prisma.mediaFolder.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const files = await prisma.mediaFile.findMany({
      where: fileWhere,
      orderBy: { createdAt: 'desc' },
      include: { folder: true },
    });

    return NextResponse.json({
      success: true,
      folders,
      files,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, folderId, folderName, color } = body;

    if (action === 'CREATE_FOLDER') {
      if (!folderName || !folderName.trim()) {
        return NextResponse.json({ success: false, error: 'Folder name is required' }, { status: 400 });
      }

      const folder = await prisma.mediaFolder.create({
        data: {
          name: folderName.trim(),
          color: color || '#E65100',
          tenantId: COPPER_GIANT_TENANT_ID,
        },
      });

      return NextResponse.json({ success: true, folder });
    }

    if (action === 'DELETE_FOLDER' && folderId) {
      await prisma.mediaFolder.delete({ where: { id: folderId } });
      return NextResponse.json({ success: true, message: 'Folder deleted' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
