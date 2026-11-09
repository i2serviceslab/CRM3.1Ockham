/**
 * Olympic Autonomous Agent Engine (v18.0)
 * Real Tool-Calling Multi-Agent Engine powered by Gemini 2.5 Flash
 * Integrated with SQLite (data/production.db), Evolution API ('olimpus'), and Claw3D Gateway
 */

import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { sendText, instanceNameFor } from '@/lib/evolution-api';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function runOlympicAgent(
  prompt: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  tenantId?: string,
  godName = 'HERMES'
): Promise<{ reply: string; toolExecutions: Array<{ tool: string; args: any; summary: string }> }> {
  const toolExecutions: Array<{ tool: string; args: any; summary: string }> = [];

  const defaultTenant =
    (await prisma.tenant.findFirst({ where: { slug: { in: ['coppergiant', 'coppergiant-silver'] } } })) ||
    (await prisma.tenant.findFirst());
  const effectiveTenantId = tenantId || defaultTenant?.id || null;

  // Snapshot context
  const [contacts, totalContacts, totalDeals] = await Promise.all([
    prisma.contact.findMany({
      where: effectiveTenantId ? { tenantId: effectiveTenantId } : {},
      take: 10,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, company: true, stage: true, leadScore: true, email: true },
    }),
    prisma.contact.count(),
    prisma.deal.count(),
  ]);

  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

  const systemPrompt = `Eres ${godName}, un agente autónomo de la élite del Olimpo en Copper Giant Resources Corp.
Base de datos del CRM en vivo:
- Total Inversionistas / Contactos: ${totalContacts}
- Total Oportunidades (Deals): ${totalDeals}
- Muestra reciente de contactos: ${contacts.map((c) => `${c.name} (${c.company}) [${c.stage}]`).join('; ')}

Responde de forma ejecutiva, veraz, ágil y concisa.`;

  try {
    const chat = model.startChat({
      history: history.map((h) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      })),
      systemInstruction: {
        role: 'system',
        parts: [{ text: systemPrompt }],
      },
    });

    const result = await chat.sendMessage(prompt);
    const reply = result.response.text();

    return { reply, toolExecutions };
  } catch (err: any) {
    return {
      reply: `⚠️ Error en el motor del Olimpo: ${err.message}`,
      toolExecutions,
    };
  }
}
