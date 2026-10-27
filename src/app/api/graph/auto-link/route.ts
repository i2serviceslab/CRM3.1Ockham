import { NextResponse } from 'next/server';
import { runActiveGraphEngine } from '@/lib/graph-engine';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const totalContacts = await prisma.contact.count();
    const totalRelationships = await prisma.relationship.count();
    
    // Group relationships by type
    const relsByType = await prisma.relationship.groupBy({
      by: ['relationshipType'],
      _count: { id: true },
    });

    // Top 5 hubs
    const allRels = await prisma.relationship.findMany({
      select: { sourceContactId: true, targetContactId: true },
    });
    const degreeMap = new Map<string, number>();
    for (const r of allRels) {
      degreeMap.set(r.sourceContactId, (degreeMap.get(r.sourceContactId) || 0) + 1);
      degreeMap.set(r.targetContactId, (degreeMap.get(r.targetContactId) || 0) + 1);
    }

    const topContactIds = [...degreeMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);

    const topContacts = await prisma.contact.findMany({
      where: { id: { in: topContactIds } },
      select: { id: true, name: true, company: true, title: true, investorType: true },
    });

    const topHubs = topContacts.map(c => ({
      ...c,
      connections: degreeMap.get(c.id) || 0,
    })).sort((a, b) => b.connections - a.connections);

    return NextResponse.json({
      success: true,
      stats: {
        totalContacts,
        totalRelationships,
        relationshipsByType: relsByType.map(r => ({ type: r.relationshipType, count: r._count.id })),
        topHubs,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { enrichContacts = true, createRelationships = true } = body;

    const result = await runActiveGraphEngine({
      enrichContacts,
      createRelationships,
    });

    return NextResponse.json({
      success: true,
      message: `Motor de relacionamiento y enriquecimiento completado en ${result.durationSeconds}s.`,
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
