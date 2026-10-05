import re
import os

# 1. Update transcribe route to return the fileId
with open('src/app/api/meetings/transcribe/route.ts', 'r') as f:
    route_code = f.read()

old_create = """    await prisma.mediaFile.create({
      data: {
        tenantId: tenantId || null,"""

new_create = """    const newMediaFile = await prisma.mediaFile.create({
      data: {
        tenantId: tenantId || null,"""

route_code = route_code.replace(old_create, new_create)

old_return = """    return NextResponse.json({ success: true, result: parsed });"""
new_return = """    return NextResponse.json({ success: true, result: parsed, fileId: newMediaFile.id });"""

route_code = route_code.replace(old_return, new_return)

with open('src/app/api/meetings/transcribe/route.ts', 'w') as f:
    f.write(route_code)


# 2. Create update route
os.makedirs('src/app/api/meetings/update', exist_ok=True)
update_route = """import { NextResponse } from 'next/server';
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
"""

with open('src/app/api/meetings/update/route.ts', 'w') as f:
    f.write(update_route)

print("Backend updated for editable meetings!")
