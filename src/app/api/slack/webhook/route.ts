import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import { getCopperFactsPromptBlock } from '@/lib/copper-facts';
import { getSlackUserName, postSlackMessage } from '@/lib/slack-client';
import { enqueueWhatsAppMessage } from '@/lib/whatsapp-queue';

const processedEvents = new Set<string>();

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // 1. Slack Events API URL Verification Challenge
    if (body?.type === 'url_verification' && body?.challenge) {
      return NextResponse.json({ challenge: body.challenge });
    }

    // 2. Event Callback (mentions, DMs, or channel messages/tasks)
    if (body?.type === 'event_callback' && body?.event) {
      const event = body.event;
      const eventId = String(body.event_id || event.client_msg_id || event.ts || '');

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
      const isChannelMsg = event.type === 'message' && (event.channel_type === 'channel' || event.channel_type === 'group');
      if (!isMention && !isDirectMsg && !isChannelMsg) {
        return NextResponse.json({ ok: true });
      }

      const rawText = String(event.text || '').replace(/<@[A-Z0-9]+>/g, '').trim();
      if (!rawText) {
        return NextResponse.json({ ok: true });
      }

      setImmediate(async () => {
        try {
          const [senderName, factsBlock, contactCount] = await Promise.all([
            getSlackUserName(event.user),
            getCopperFactsPromptBlock(),
            prisma.contact.count(),
          ]);

          let isTaskOrRequest = isMention || isDirectMsg;
          let taskTitle = rawText.slice(0, 140);
          let solutionDraft = `Recibido mensaje de ${senderName}: "${rawText}".`;

          const geminiKey = process.env.GEMINI_API_KEY;
          if (geminiKey) {
            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const prompt = `Eres Olimpo, el asistente ejecutivo de Nelson Carvajal en Copper Giant Resources Corp.
Analiza este mensaje de Slack enviado por "${senderName}":
"${rawText}"

Contexto CRM: ${contactCount} contactos.
${factsBlock}

Devuelve SOLO JSON válido con esta estructura exacta:
{
  "isTaskOrNeedsNelson": true/false,
  "taskTitle": "título corto y accionable de la tarea o solicitud (máx 100 chars)",
  "solutionAndReply": "explicación breve de cómo resolverlo + borrador de respuesta lista para usar"
}`;
            const result = await model.generateContent(prompt);
            const txt = result.response.text() || '';
            const jsonMatch = txt.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (typeof parsed.isTaskOrNeedsNelson === 'boolean') {
                  isTaskOrRequest = parsed.isTaskOrNeedsNelson || isMention || isDirectMsg;
                }
                if (parsed.taskTitle) taskTitle = String(parsed.taskTitle).slice(0, 140);
                if (parsed.solutionAndReply) solutionDraft = String(parsed.solutionAndReply);
              } catch {}
            }
          }

          // Create CRM Task when someone assigns a task or requests action
          if (isTaskOrRequest) {
            await prisma.task
              .create({
                data: {
                  title: `[Slack] ${taskTitle}`,
                  description: `De: ${senderName}\nMensaje: ${rawText}\n\nSolución sugerida:\n${solutionDraft}`,
                  priority: 'High',
                  dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                },
              })
              .catch(() => {});

            // Notify Nelson via WhatsApp (Olimpus) with the message + proposed solution
            const notifyPhone = process.env.NOTIFY_TEAM_PHONE || '+573207116676';
            enqueueWhatsAppMessage({
              to: notifyPhone,
              text:
                `💬 *Nuevo mensaje/tarea en Slack*\n` +
                `• *De:* ${senderName}\n` +
                `• *Mensaje:* ${rawText}\n\n` +
                `🪽 *Solución sugerida por Olimpo:*\n${solutionDraft}`,
              senderName: 'Olimpo Slack Alert',
            });
          }

          // Reply directly in Slack only if @Olimpo was mentioned or in bot DM
          if (isMention || isDirectMsg) {
            await postSlackMessage({
              channel: event.channel,
              text: solutionDraft,
              threadTs: event.thread_ts || event.ts,
            });
          }
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
