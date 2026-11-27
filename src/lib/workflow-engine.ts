import { prisma } from '@/lib/prisma';
import { enqueueWhatsAppMessage, renderWhatsAppTemplate } from '@/lib/whatsapp-queue';

export interface WorkflowContactSnapshot {
  id: string;
  name: string;
  company?: string | null;
  stage?: string | null;
  leadScore?: number | null;
  tags?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  tenantId?: string | null;
}

/**
 * Evaluates active WorkflowRule records against a contact event and executes
 * configured actions without throwing into the caller's request path.
 */
export async function executeWorkflowsForContact(
  event: {
    triggerType: 'LEAD_SCORE_ABOVE' | 'STAGE_CHANGED' | 'TAG_ADDED';
    triggerValue?: string;
  },
  contact: WorkflowContactSnapshot
): Promise<void> {
  try {
    const rules = await prisma.workflowRule.findMany({
      where: {
        isActive: true,
        triggerType: event.triggerType,
        ...(contact.tenantId ? { OR: [{ tenantId: contact.tenantId }, { tenantId: null }] } : {}),
      },
    });

    if (rules.length === 0) return;

    for (const rule of rules) {
      let matched = false;
      const tv = (rule.triggerValue || '').trim();

      if (event.triggerType === 'LEAD_SCORE_ABOVE') {
        const threshold = parseInt(tv, 10);
        if (!Number.isNaN(threshold) && (contact.leadScore || 0) >= threshold) {
          matched = true;
        }
      } else if (event.triggerType === 'STAGE_CHANGED') {
        if (!tv || (contact.stage || '').toLowerCase() === tv.toLowerCase()) {
          matched = true;
        }
      } else if (event.triggerType === 'TAG_ADDED') {
        const tagsStr = (contact.tags || '').toLowerCase();
        if (!tv || tagsStr.includes(tv.toLowerCase())) {
          matched = true;
        }
      }

      if (!matched) continue;

      const templateVars = {
        nombre: contact.name,
        empresa: contact.company || 'su organización',
        etapa: contact.stage || '',
      };

      if (rule.actionType === 'ADD_SCORE') {
        const nextScore = Math.min(100, (contact.leadScore || 0) + 20);
        await prisma.contact.update({
          where: { id: contact.id },
          data: { leadScore: nextScore },
        });
        await prisma.timelineActivity.create({
          data: {
            contactId: contact.id,
            type: 'WORKFLOW',
            title: `Workflow "${rule.name}": +20 Lead Score`,
            description: `Regla automática ejecutada (${rule.triggerType}: ${rule.triggerValue}). Score actualizado a ${nextScore}.`,
          },
        });
      } else if (rule.actionType === 'NOTIFY_TEAM') {
        const msgText = renderWhatsAppTemplate(
          rule.actionValue || `🔔 Alerta CRM: {{nombre}} ({{empresa}}) activó "${rule.name}" en etapa {{etapa}}.`,
          templateVars
        );
        const notifyPhone = process.env.NOTIFY_TEAM_PHONE;
        if (notifyPhone) {
          enqueueWhatsAppMessage({ to: notifyPhone, text: msgText, senderName: `Workflow: ${rule.name}` });
        }
        await prisma.timelineActivity.create({
          data: {
            contactId: contact.id,
            type: 'WORKFLOW',
            title: `Workflow "${rule.name}": Notificación al Equipo`,
            description: msgText,
          },
        });
      } else if (rule.actionType === 'SEND_WHATSAPP') {
        const targetPhone = contact.whatsapp || contact.phone;
        const msgText = renderWhatsAppTemplate(
          rule.actionValue || `Hola {{nombre}}, gracias por conectar con Copper Giant Resources.`,
          templateVars
        );
        if (targetPhone) {
          enqueueWhatsAppMessage({ to: targetPhone, text: msgText, senderName: `Workflow: ${rule.name}` });
        }
        await prisma.timelineActivity.create({
          data: {
            contactId: contact.id,
            type: 'WORKFLOW',
            title: `Workflow "${rule.name}": WhatsApp ${targetPhone ? 'encolado' : 'sin número'}`,
            description: msgText,
          },
        });
      }
    }
  } catch (err) {
    console.warn('[WorkflowEngine] Non-fatal execution error:', err);
  }
}
