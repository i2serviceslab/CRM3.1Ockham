import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import * as cheerio from 'cheerio';
import { YoutubeTranscript } from 'youtube-transcript';
import { sendText, instanceNameFor } from '@/lib/evolution-api';

const apiKey = process.env.GEMINI_API_KEY || '';
const openaiKey = process.env.OPENAI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Panteón Olímpico de Copper Giant
const OLYMPIC_GODS: Record<string, { name: string; title: string; prompt: string; signature: string }> = {
  HERMES: {
    name: 'Hermes',
    title: 'Orquestador Central & Relaciones CRM',
    prompt: `Eres Hermes, el Orquestador del Olimpo y Heraldo de Copper Giant Resources Corp. (TSXV: CGNT | OTCQX: CGNRF).
Gestionas la comunicación ágil, los contactos de inversores, tareas y la coordinación operativa con Nelson y el equipo. Eres sobrio, ejecutivo, proactivo y cortés.
Si te piden buscar contactos, consultar el CRM o enviar mensajes por WhatsApp, ejecuta las herramientas correspondientes.`,
    signature: '— 🪽 Hermes (Orquestador Central)',
  },
  PLUTUS: {
    name: 'Plutus',
    title: 'Capital, Inversores Institucionales & Pipeline Minero',
    prompt: `Eres Plutus, el Guardián del Capital y Pipeline Minero del Olimpo para Copper Giant Resources Corp.
Tu dominio son los fondos mineros de Vancouver, Londres, Toronto y Nueva York, Family Offices, inversores institucionales, financiamiento de exploración y acuerdos de capital.
Conoces en detalle las etapas del pipeline (Lead Prospect, Meeting Scheduled, Deck Sent, Follow-up Required, Deal Committed, Strategic Partner).`,
    signature: '— 💎 Plutus (Capital & Pipeline)',
  },
  ATHENA: {
    name: 'Athena',
    title: 'Inteligencia Estratégica, Doctrina & NI 43-101',
    prompt: `Eres Athena, la Estratega y Auditora Técnica del Olimpo para Copper Giant Resources Corp.
Auditas datos geológicos del pórfido de cobre-molibdeno Mocoa, leyes minerales (Cu % y Mo %), recursos estimados bajo NI 43-101, cumplimiento con la TSX-V y taxonomía de valor. Eres rigurosa y analítica.`,
    signature: '— 🦉 Athena (Doctrina & NI 43-101)',
  },
  ARGUS: {
    name: 'Argus Panoptes',
    title: 'Centinela 24/7 & Vigilancia de Infraestructura y Mercado',
    prompt: `Eres Argus Panoptes, el Centinela 24/7 del Olimpo.
Monitoreas la infraestructura de servidores, la integridad del portal web coppergiant.com, los precios internacionales de commodities (Cu, Mo, Au, Ag) y noticias del sector minero.`,
    signature: '— 👁️ Argus (Centinela 24/7)',
  },
  ZEUS: {
    name: 'Zeus',
    title: 'Alter-Ego Ejecutivo de Ian Harris (CEO)',
    prompt: `Eres Zeus, el Soberano del Olimpo y Alter-Ego Estratégico de Ian Harris (CEO de Copper Giant Resources Corp.).
Tomas directivas ejecutivas de alto nivel, desafías supuestos con mentalidad de operador minero experimentado y defiendes el valor para los accionistas.`,
    signature: '— ⚡ Zeus (CEO Alter-Ego)',
  },
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sessionId,
      tenantId,
      crmUserId = 'usr-1',
      user = 'Nelson',
      message = '',
      audioUrl = null,
      audioTranscript = null,
      files = [],
      worker = 'HERMES',
    } = body;

    let targetSessionId = sessionId;

    // Ensure session exists in DB
    if (targetSessionId) {
      const exists = await prisma.hermesSession.findUnique({ where: { id: targetSessionId } });
      if (!exists) targetSessionId = null;
    }

    if (!targetSessionId) {
      const newSession = await prisma.hermesSession.create({
        data: {
          tenantId: tenantId || null,
          title: message ? message.slice(0, 35) + '...' : audioTranscript ? audioTranscript.slice(0, 35) : 'Nueva consulta',
        },
      });
      targetSessionId = newSession.id;
    }

    const promptText = message || audioTranscript || (files.length > 0 ? `Archivos adjuntos: ${files.map((f: any) => f.name).join(', ')}` : '');

    const savedUserMsg = await prisma.hermesMessage.create({
      data: {
        sessionId: targetSessionId,
        role: 'user',
        content: promptText,
        attachments: files.length > 0 ? JSON.stringify(files) : null,
        audioUrl: audioUrl || null,
        workerName: worker,
      },
    });

    await prisma.hermesSession.update({
      where: { id: targetSessionId },
      data: { updatedAt: new Date() },
    });

    if (apiKey || openaiKey) {
      processAgenticLoop(targetSessionId, promptText, worker, tenantId).catch(console.error);
    } else {
      await prisma.hermesMessage.create({
        data: {
          sessionId: targetSessionId,
          role: 'assistant',
          content: '⚠️ No se ha configurado `GEMINI_API_KEY` ni `OPENAI_API_KEY` en las variables de entorno.',
          workerName: worker,
          workerStatus: 'error',
        },
      });
    }

    return NextResponse.json({
      success: true,
      sessionId: targetSessionId,
      messageId: savedUserMsg.id,
      status: 'PROCESSING_VIA_OLYMPUS',
    });
  } catch (error: any) {
    console.error('Error in /api/hermes/chat:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// BUCLE AGÉNTICO DEL OLIMPO
async function processAgenticLoop(sessionId: string, promptText: string, worker: string, tenantId?: string) {
  let processingMsgId = '';
  try {
    const godKey = (worker || 'HERMES').toUpperCase();
    const god = OLYMPIC_GODS[godKey] || OLYMPIC_GODS.HERMES;

    const processingMsg = await prisma.hermesMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: `${god.name} está consultando la memoria y ejecutando herramientas...`,
        workerName: godKey,
        workerStatus: 'running',
      },
    });
    processingMsgId = processingMsg.id;

    const defaultTenant = (await prisma.tenant.findFirst({ where: { slug: { in: ['coppergiant', 'coppergiant-silver'] } } })) || (await prisma.tenant.findFirst());
    const effectiveTenantId = tenantId || defaultTenant?.id || null;

    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      tools: [
        {
          functionDeclarations: [
            {
              name: 'query_crm_memory',
              description: 'Busca información en la base de datos del CRM (5,000+ contactos mineros, inversores, deals o archivos).',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  entity: {
                    type: SchemaType.STRING,
                    description: "Debe ser 'contacts' (inversores y directores), 'deals' (oportunidades/capital), o 'files' (doctrinas/documentos).",
                  },
                  query: { type: SchemaType.STRING, description: 'Término de búsqueda (nombre, empresa, fondo, cargo, etc.)' },
                },
                required: ['entity', 'query'],
              },
            },
            {
              name: 'create_contact',
              description: 'Registra un nuevo inversor, fondo o contacto minero en la base de datos del CRM.',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  name: { type: SchemaType.STRING, description: 'Nombre completo' },
                  company: { type: SchemaType.STRING, description: 'Empresa o Fondo' },
                  email: { type: SchemaType.STRING, description: 'Correo electrónico' },
                  phone: { type: SchemaType.STRING, description: 'Teléfono o WhatsApp' },
                  stage: { type: SchemaType.STRING, description: 'Etapa (Lead Prospect, Meeting Scheduled, Deck Sent, Follow-up Required, Deal Committed, Strategic Partner)' },
                  investorType: { type: SchemaType.STRING, description: 'Tipo (Institutional Investor, Family Office, HNW investor, Strategic Corporate, Retail investor)' },
                  notes: { type: SchemaType.STRING, description: 'Notas estratégicas' },
                },
                required: ['name'],
              },
            },
            {
              name: 'update_contact_stage',
              description: 'Actualiza la etapa de pipeline de un inversor existente en el CRM.',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  contactIdOrName: { type: SchemaType.STRING, description: 'ID o nombre exacto del contacto' },
                  newStage: { type: SchemaType.STRING, description: 'Nueva etapa' },
                },
                required: ['contactIdOrName', 'newStage'],
              },
            },
            {
              name: 'send_whatsapp_message',
              description: 'Envía un mensaje real de WhatsApp usando la instancia oficial de Evolution API (olimpus).',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  to: { type: SchemaType.STRING, description: 'Número de WhatsApp (ej: 573207116676)' },
                  message: { type: SchemaType.STRING, description: 'Texto del mensaje a enviar' },
                },
                required: ['to', 'message'],
              },
            },
            {
              name: 'scrape_website',
              description: 'Lee y extrae el texto de una página web minera o noticia financiera.',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  url: { type: SchemaType.STRING, description: 'URL a consultar' },
                },
                required: ['url'],
              },
            },
            {
              name: 'draft_social_post',
              description: 'Redacta y guarda un borrador en el Social Calendar del CRM.',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  title: { type: SchemaType.STRING, description: 'Título interno' },
                  content: { type: SchemaType.STRING, description: 'Contenido redactado' },
                  platforms: { type: SchemaType.STRING, description: 'Plataformas (linkedin,x,instagram)' },
                },
                required: ['title', 'content', 'platforms'],
              },
            },
            {
              name: 'save_ai_knowledge',
              description: 'Aprende y almacena una directiva o doctrina permanente en la memoria central del Olimpo.',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  title: { type: SchemaType.STRING, description: 'Título de la directiva' },
                  textContent: { type: SchemaType.STRING, description: 'Contenido de la directiva o regla' },
                },
                required: ['title', 'textContent'],
              },
            },
          ],
        },
      ],
    });

    const previousMessages = await prisma.hermesMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    // Estadísticas en vivo de la DB
    const [totalContacts, totalDeals] = await Promise.all([
      prisma.contact.count(),
      prisma.deal.count(),
    ]);

    const systemPrompt = `${god.prompt}

[ESTADO DE LA BASE DE DATOS DEL CRM]:
- Total contactos e inversores indexados: ${totalContacts}
- Total oportunidades de capital (Deals): ${totalDeals}
- Instancia WhatsApp en vivo: Evolution API 'olimpus'
- Proyecto Central: Pórfido Mocoa Cu-Mo (Putumayo, Colombia), TSXV: CGNT | OTCQX: CGNRF.

[INSTRUCCIONES CLAVE]:
1. Si te consultan por inversores, fondos, directores o métricas, SIEMPRE ejecuta 'query_crm_memory'.
2. Si te piden registrar o actualizar un contacto, ejecuta 'create_contact' o 'update_contact_stage'.
3. Si te piden enviar un WhatsApp, ejecuta 'send_whatsapp_message'.
4. Concluye siempre con tu firma institucional: ${god.signature}.`;

    const history = previousMessages.slice(0, -2).map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history,
      systemInstruction: {
        role: 'system',
        parts: [{ text: systemPrompt }],
      },
    });

    let result = await chat.sendMessage(promptText);
    let finalContent = result.response.text();
    let currentResponse = result.response;

    let loopCount = 0;
    const MAX_LOOPS = 5;

    while (currentResponse.functionCalls() && currentResponse.functionCalls()!.length > 0 && loopCount < MAX_LOOPS) {
      loopCount++;
      const calls = currentResponse.functionCalls()!;
      const call = calls[0];

      if (call.name === 'query_crm_memory') {
        const { entity, query } = call.args as any;
        await prisma.hermesMessage.update({
          where: { id: processingMsgId },
          data: { content: `🔍 [${god.name}: Memoria CRM] Buscando "${query}" en ${entity}...` },
        });

        let resultsText = '';
        try {
          if (entity === 'contacts') {
            const contacts = await prisma.contact.findMany({
              where: {
                OR: [
                  { name: { contains: query } },
                  { company: { contains: query } },
                  { email: { contains: query } },
                  { investorType: { contains: query } },
                ],
              },
              take: 10,
              select: { id: true, name: true, company: true, title: true, email: true, phone: true, stage: true, investorType: true, leadScore: true },
            });
            resultsText = contacts.length ? JSON.stringify(contacts) : `No se encontraron contactos coincidentes con "${query}".`;
          } else if (entity === 'deals') {
            const deals = await prisma.deal.findMany({
              where: {
                OR: [{ title: { contains: query } }, { notes: { contains: query } }],
              },
              take: 10,
            });
            resultsText = deals.length ? JSON.stringify(deals) : `No se encontraron deals con "${query}".`;
          } else if (entity === 'files') {
            const files = await prisma.mediaFile.findMany({
              where: {
                OR: [{ name: { contains: query } }, { aiSummary: { contains: query } }],
              },
              take: 5,
            });
            resultsText = files.length ? JSON.stringify(files.map((f) => ({ nombre: f.name, resumen: f.aiSummary }))) : 'No se encontraron archivos.';
          }
        } catch (err: any) {
          resultsText = `Error al consultar CRM: ${err.message}`;
        }
        result = await chat.sendMessage(`Resultado (query_crm_memory):\n${resultsText}`);

      } else if (call.name === 'create_contact') {
        const args = call.args as any;
        await prisma.hermesMessage.update({
          where: { id: processingMsgId },
          data: { content: `💾 [${god.name}: CRM] Creando contacto "${args.name}"...` },
        });

        let resultMsg = '';
        try {
          const created = await prisma.contact.create({
            data: {
              tenantId: effectiveTenantId,
              name: args.name,
              company: args.company || 'Empresa Independiente',
              email: args.email || null,
              phone: args.phone || null,
              whatsapp: args.phone || null,
              stage: args.stage || 'Lead Prospect',
              investorType: args.investorType || 'HNW investor',
              dynamicIcebreaker: args.notes || 'Registrado desde El Olimpo CRM Studio.',
              strategicContext: args.notes || 'Creado via Olimpo Multi-Agent Engine.',
              leadScore: 75,
              source: `Olimpo Agent (${god.name})`,
            },
          });
          resultMsg = `✅ Contacto creado exitosamente con ID: ${created.id}`;
        } catch (err: any) {
          resultMsg = `Error al crear contacto: ${err.message}`;
        }
        result = await chat.sendMessage(`Resultado (create_contact): ${resultMsg}`);

      } else if (call.name === 'update_contact_stage') {
        const { contactIdOrName, newStage } = call.args as any;
        await prisma.hermesMessage.update({
          where: { id: processingMsgId },
          data: { content: `⚡ [${god.name}: Pipeline] Actualizando etapa de "${contactIdOrName}" a "${newStage}"...` },
        });

        let resultMsg = '';
        try {
          const contact = await prisma.contact.findFirst({
            where: {
              OR: [{ id: contactIdOrName }, { name: { contains: contactIdOrName } }],
            },
          });
          if (contact) {
            await prisma.contact.update({
              where: { id: contact.id },
              data: { stage: newStage, updatedAt: new Date() },
            });
            resultMsg = `✅ Etapa de "${contact.name}" actualizada a "${newStage}".`;
          } else {
            resultMsg = `No se encontró contacto con identificador "${contactIdOrName}".`;
          }
        } catch (err: any) {
          resultMsg = `Error al actualizar: ${err.message}`;
        }
        result = await chat.sendMessage(`Resultado (update_contact_stage): ${resultMsg}`);

      } else if (call.name === 'send_whatsapp_message') {
        const { to, message: waText } = call.args as any;
        await prisma.hermesMessage.update({
          where: { id: processingMsgId },
          data: { content: `📱 [${god.name}: WhatsApp] Despachando mensaje a ${to}...` },
        });

        let resultMsg = '';
        try {
          const sentId = await sendText(instanceNameFor(), to, waText);
          if (sentId) {
            resultMsg = `✅ Mensaje de WhatsApp despachado exitosamente (ID: ${sentId}).`;
          } else {
            resultMsg = `⚠️ Mensaje despachado hacia la cola de Evolution API.`;
          }
        } catch (err: any) {
          resultMsg = `Error al enviar WhatsApp: ${err.message}`;
        }
        result = await chat.sendMessage(`Resultado (send_whatsapp_message): ${resultMsg}`);

      } else if (call.name === 'scrape_website') {
        const { url } = call.args as any;
        await prisma.hermesMessage.update({
          where: { id: processingMsgId },
          data: { content: `🌐 [${god.name}: Web] Leyendo ${url}...` },
        });

        let extracted = '';
        try {
          const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } });
          const html = await res.text();
          const $ = cheerio.load(html);
          $('script, style, noscript, nav, footer').remove();
          extracted = $('body').text().replace(/\s+/g, ' ').trim();
          if (extracted.length > 15000) extracted = extracted.substring(0, 15000) + '...';
        } catch (err: any) {
          extracted = `Error al leer web: ${err.message}`;
        }
        result = await chat.sendMessage(`Resultado (scrape_website):\n${extracted}`);

      } else if (call.name === 'draft_social_post') {
        const { title, content: postContent, platforms } = call.args as any;
        await prisma.hermesMessage.update({
          where: { id: processingMsgId },
          data: { content: `✍️ [${god.name}: Social] Guardando borrador "${title}"...` },
        });

        let resultMsg = '';
        try {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const post = await prisma.socialPost.create({
            data: {
              tenantId: effectiveTenantId,
              title,
              content: postContent,
              platforms: platforms || 'linkedin,x',
              status: 'draft',
              scheduledDate: tomorrow,
            },
          });
          resultMsg = `✅ Borrador guardado exitosamente (ID: ${post.id}).`;
        } catch (err: any) {
          resultMsg = `Error al guardar borrador: ${err.message}`;
        }
        result = await chat.sendMessage(`Resultado (draft_social_post): ${resultMsg}`);

      } else if (call.name === 'save_ai_knowledge') {
        const { title, textContent } = call.args as any;
        await prisma.hermesMessage.update({
          where: { id: processingMsgId },
          data: { content: `🧠 [${god.name}: Doctrina] Guardando regla "${title}"...` },
        });

        let resultMsg = '';
        try {
          let folder = await prisma.mediaFolder.findFirst({
            where: { name: 'Doctrina Olimpo', tenantId: effectiveTenantId },
          });
          if (!folder) {
            folder = await prisma.mediaFolder.create({
              data: {
                name: 'Doctrina Olimpo',
                description: 'Memoria doctrinal de los agentes del Olimpo',
                color: '#FF002C',
                isSystem: true,
                tenantId: effectiveTenantId,
              },
            });
          }
          await prisma.mediaFile.create({
            data: {
              tenantId: effectiveTenantId,
              folderId: folder.id,
              name: `${title}.txt`,
              originalName: `${title}.txt`,
              mimeType: 'text/plain',
              size: textContent.length,
              url: 'local://olympus-doctrine',
              aiSummary: textContent,
            },
          });
          resultMsg = `✅ Directiva guardada en la memoria doctrinal del Olimpo.`;
        } catch (err: any) {
          resultMsg = `Error al guardar doctrina: ${err.message}`;
        }
        result = await chat.sendMessage(`Resultado (save_ai_knowledge): ${resultMsg}`);
      }

      currentResponse = result.response;
      finalContent = currentResponse.text();
    }

    // Asegurar firma si no está presente
    if (finalContent && !finalContent.includes(god.signature)) {
      finalContent = `${finalContent}\n\n${god.signature}`;
    }

    await prisma.hermesMessage.update({
      where: { id: processingMsgId },
      data: {
        content: finalContent || 'Operación completada exitosamente.',
        workerStatus: 'completed',
      },
    });
  } catch (err: any) {
    console.error('Olympic Agentic Loop Error:', err);
    if (processingMsgId) {
      await prisma.hermesMessage.update({
        where: { id: processingMsgId },
        data: {
          content: `⚠️ Incidencia en la ejecución del agente del Olimpo: ${err.message}`,
          workerStatus: 'error',
        },
      });
    }
  }
}
