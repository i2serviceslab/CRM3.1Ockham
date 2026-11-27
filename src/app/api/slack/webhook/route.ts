import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import { getCopperFactsPromptBlock } from '@/lib/copper-facts';
import { postSlackMessage } from '@/lib/slack-client';

const processedEvents = new Set<string>();

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // 1. Slack Events API URL Verification Challenge
    if (body?.type === 'url_verification' && body?.challenge) {
      return NextResponse.json({ challenge: body.challenge });
    }

    // 2. Event Callback (app_mention or direct message)
    if (body?.type === 'event_callback' && body?.event) {
      const event = body.event;
      const eventId = String(body.event_id || event.client_msg_id || event.ts || '');

      // Ignore bot's own messages & duplicate retries
      if (event.bot_id || event.subtype === 'bot_message') {
        return NextResponse.json({ ok: true });
      }
      if (eventId && processedEvents.has(eventId)) {
        return NextResponse.json({ ok: true });
      }
      if (eventId) {
        processedEvents.add(eventId);
        if (processedEvents.size > 500) {
          const first = processedEvents.values().next().value;
          if (first) processedEvents.delete(first);
        }
      }

      const isMention = event.type === 'app_mention';
      const isDirectMsg = event.type === 'message' && event.channel_type === 'im';
      if (!isMention && !isDirectMsg) {
        return NextResponse.json({ ok: true });
      }

      const rawText = String(event.text || '').replace(/<@[A-Z0-9]+>/g, '').trim();
      if (!rawText) {
        return NextResponse.json({ ok: true });
      }

      // Process asynchronously so Slack doesn't retry after 3s
      setImmediate(async () => {
        try {
          const geminiKey = process.env.GEMINI_API_KEY;
          const [factsBlock, contactCount] = await Promise.all([
            getCopperFactsPromptBlock(),
            prisma.contact.count(),
          ]);

          let replyText = `🪽 *Olimpo CRM*: Recibí "${rawText}". Actualmente hay *${contactCount}* contactos registrados en Copper Giant CRM.`;

          if (geminiKey) {
            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const prompt = `Eres Olimpo, el asistente ejecutivo de Copper Giant Resources Corp. en Slack.
Responde de forma concisa, directa y profesional en español usando Markdown simple de Slack (*negritas*, viñetas).
Contactos totales en CRM: ${contactCount}.
${factsBlock}

Mensaje del usuario en Slack:
${rawText}`;
            const result = await model.generateContent(prompt);
            const aiText = result.response.text()?.trim();
            if (aiText) replyText = aiText;
          }

          await postSlackMessage({
            channel: event.channel,
            text: replyText,
            threadTs: event.thread_ts || event.ts,
          });
        } catch (err) {
          console.error('[Slack Webhook] Async processing error:', err);
        }
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message }, { status: 500 });
  }
}
