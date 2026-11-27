import { sendText, instanceNameFor } from '@/lib/evolution-api';
import { prisma } from '@/lib/prisma';

export interface OutboundQueueItem {
  to: string;
  text: string;
  senderName?: string;
  retries?: number;
}

const queue: OutboundQueueItem[] = [];
let draining = false;

export function renderWhatsAppTemplate(
  template: string,
  vars: { nombre?: string; empresa?: string; etapa?: string; [key: string]: string | undefined }
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_m, key) => vars[key] || '');
}

async function drainQueue() {
  if (draining) return;
  draining = true;
  try {
    while (queue.length > 0) {
      const item = queue.shift()!;
      const msgId = await sendText(instanceNameFor(), item.to, item.text);
      if (msgId) {
        await prisma.whatsAppMessage
          .create({
            data: {
              fromNumber: 'CRM Bot',
              senderName: item.senderName || 'Olimpus Workflow',
              toNumber: item.to,
              message: item.text,
              direction: 'OUTBOUND',
            },
          })
          .catch(() => {});
      } else if ((item.retries || 0) < 2) {
        queue.push({ ...item, retries: (item.retries || 0) + 1 });
      }
      // Anti-spam pacing (1.5s–2.5s jitter)
      const jitterMs = 1500 + Math.floor(Math.random() * 1000);
      await new Promise((r) => setTimeout(r, jitterMs));
    }
  } finally {
    draining = false;
  }
}

export function enqueueWhatsAppMessage(item: OutboundQueueItem): void {
  if (!item.to || !item.text) return;
  queue.push(item);
  setImmediate(() => {
    drainQueue().catch(() => {});
  });
}
