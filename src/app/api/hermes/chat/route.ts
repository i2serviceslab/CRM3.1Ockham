import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import * as cheerio from 'cheerio';
import { YoutubeTranscript } from 'youtube-transcript';


const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

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
      worker = 'GENERAL',
    } = body;

    let targetSessionId = sessionId;

    // Ensure session actually exists in DB to prevent foreign key errors
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
        workerName: worker !== 'GENERAL' ? worker : null,
      },
    });

    await prisma.hermesSession.update({
      where: { id: targetSessionId },
      data: { updatedAt: new Date() },
    });

    if (apiKey) {
      // Run Agentic loop in background
      processAgenticLoop(targetSessionId, promptText, worker, tenantId).catch(console.error);
    } else {
      await prisma.hermesMessage.create({
        data: {
          sessionId: targetSessionId,
          role: 'assistant',
          content: '⚠️ No se ha configurado la variable de entorno `GEMINI_API_KEY`.',
          workerName: worker,
          workerStatus: 'error'
        }
      });
    }

    return NextResponse.json({
      success: true,
      sessionId: targetSessionId,
      messageId: savedUserMsg.id,
      status: 'PROCESSING_VIA_GEMINI',
    });
  } catch (error: any) {
    console.error('Error in /api/hermes/chat:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// THE AGENTIC LOOP (Micro-Harness)
async function processAgenticLoop(sessionId: string, promptText: string, worker: string, tenantId?: string) {
  let processingMsgId = '';
  try {
    const processingMsg = await prisma.hermesMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: 'Analizando y ejecutando herramientas...',
        workerName: worker,
        workerStatus: 'running'
      }
    });
    processingMsgId = processingMsg.id;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      tools: [{
        functionDeclarations: [
          {
            name: "scrape_website",
            description: "Extrae y lee el texto principal de una página web (URL). Úsalo cuando el usuario te pida revisar una web, resumir un link o buscar información en una URL específica.",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                url: { type: SchemaType.STRING, description: "La URL completa a leer (ej. https://example.com)" }
              },
              required: ["url"]
            }
          },
          {
            name: "query_crm_memory",
            description: "Busca información en la base de datos (Memoria) del CRM. Úsalo para buscar contactos, inversores, posteos de redes sociales anteriores o archivos del Drive.",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                entity: { type: SchemaType.STRING, description: "El tipo de información a buscar. Debe ser 'contacts' (contactos/inversores), 'social_posts' (publicaciones de redes/marketing), o 'files' (archivos/documentos)." },
                query: { type: SchemaType.STRING, description: "Palabra clave o término de búsqueda (ej. 'CEO', 'Cobre', 'Reporte', nombre de la persona)." }
              },
              required: ["entity", "query"]
            }
          },
          {
            name: "draft_social_post",
            description: "Redacta y guarda un borrador de publicación en el Social Calendar del CRM para que el Community Manager lo apruebe.",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING, description: "Título interno o idea principal del post." },
                content: { type: SchemaType.STRING, description: "El contenido final redactado del post (incluyendo hashtags y emojis)." },
                platforms: { type: SchemaType.STRING, description: "Plataformas sugeridas (ej. 'linkedin,twitter,instagram')." },
                scheduledDate: { type: SchemaType.STRING, description: "Opcional. Fecha y hora en formato ISO. Si el usuario NO especifica una fecha, omite este campo." }
              },
              required: ["title", "content", "platforms"]
            }
          },
          {
            name: "save_ai_knowledge",
            description: "Guarda una regla, instrucción, o doctrina de comunicación en el Drive (carpeta Doctrina) para recordarlo permanentemente en el futuro. Úsalo cuando el usuario te pida que aprendas o guardes un parámetro.",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING, description: "Título del documento o regla (ej. 'Tono de marca', 'Estructura de Posts')." },
                textContent: { type: SchemaType.STRING, description: "El contenido completo de la regla, doctrina o conocimiento que debes aprender y guardar." }
              },
              required: ["title", "textContent"]
            }
          },
          {
            name: "extract_youtube_transcript",
            description: "Extrae los subtítulos/transcripción de un video de YouTube para analizar sus temas, encontrar cortes (clips) o generar contenido.",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                url: { type: SchemaType.STRING, description: "La URL completa del video de YouTube." }
              },
              required: ["url"]
            }
          }
        ]
      }]
    });

    const previousMessages = await prisma.hermesMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' }
    });

    const history = previousMessages.slice(0, -2).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({
      history,
      systemInstruction: {
        role: 'system',
        parts: [{ text: `Eres Forge, el asistente de IA nativo del CRM de Copper Giant. 
      Si el usuario te pregunta por un contacto, un correo, posteos pasados o documentos, SIEMPRE usa la herramienta 'query_crm_memory' para buscar en la base de datos antes de responder.
      Si el usuario te pide crear un post o redactar contenido para redes sociales, usa la herramienta 'draft_social_post' para guardarlo en el Social Calendar como borrador para el Community Manager.
      Si el usuario te pide analizar un video de YouTube o sacar clips/cortes, usa la herramienta 'extract_youtube_transcript' para leer el contenido del video.
      Si el usuario te pide guardar o aprender un parámetro de comunicación, usa 'save_ai_knowledge'. 
      Para leer doctrinas, usa 'query_crm_memory' buscando en la entidad 'files'.
      Responde de forma ejecutiva, corporativa y estratégica.` }]
      }
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

      if (call.name === "scrape_website") {
        const urlArgs = call.args as any;
        const targetUrl = urlArgs.url;
        await prisma.hermesMessage.update({ where: { id: processingMsgId }, data: { content: `👁️ [Plugin: Scraping] Leyendo sitio web: ${targetUrl}...` } });
        
        let extractedText = "";
        try {
          const res = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
          const html = await res.text();
          const $ = cheerio.load(html);
          $('script, style, noscript, nav, footer').remove();
          extractedText = $('body').text().replace(/\s+/g, ' ').trim();
          if (extractedText.length > 15000) extractedText = extractedText.substring(0, 15000) + '...'; 
        } catch (err: any) {
          extractedText = `Error al leer la web: ${err.message}`;
        }
        result = await chat.sendMessage(`Resultado (scrape_website):

${extractedText}`);
      
      } else if (call.name === "draft_social_post") {
        const { title, content, platforms, scheduledDate } = call.args as any;
        await prisma.hermesMessage.update({ where: { id: processingMsgId }, data: { content: `✍️ [Plugin: Social Calendar] Guardando borrador: "${title}"...` } });
        
        let finalDate = new Date();
        finalDate.setDate(finalDate.getDate() + 1); // Mañana por defecto
        if (scheduledDate) {
          const parsed = new Date(scheduledDate);
          if (!isNaN(parsed.getTime())) {
            finalDate = parsed;
          }
        }

        let resultMsg = "";
        try {
          const post = await prisma.socialPost.create({
            data: {
              tenantId: tenantId || null,
              title, content, platforms: platforms || 'linkedin,x', status: 'draft',
              scheduledDate: finalDate, isRecurring: false
            }
          });
          
          await prisma.task.create({
            data: {
              title: `Revisar borrador de publicación: ${title}`,
              description: `Forge ha creado un borrador.
Plataformas: ${platforms}
Fecha: ${scheduledDate}`,
              priority: 'High', status: 'PENDING'
            }
          });
          await prisma.systemAuditLog.create({
            data: { tenantId: tenantId || null, action: 'DRAFT_POST', description: `Forge generó un borrador: '${title}'.` }
          });
          resultMsg = `Éxito. ID del post: ${post.id}.`;
        } catch (err: any) {
          resultMsg = `Error: ${err.message}`;
        }
        result = await chat.sendMessage(`Resultado (draft_social_post): ${resultMsg}`);
        
      } else if (call.name === "save_ai_knowledge") {
        const { title, textContent } = call.args as any;
        await prisma.hermesMessage.update({ where: { id: processingMsgId }, data: { content: `🧠 [Plugin: Doctrina] Guardando aprendizaje: "${title}"...` } });
        
        let resultMsg = "";
        try {
          // Buscar o crear la carpeta Doctrina
          let folder = await prisma.mediaFolder.findFirst({ where: { name: 'Doctrina Forge', tenantId: tenantId || null } });
          if (!folder) {
            folder = await prisma.mediaFolder.create({
              data: { name: 'Doctrina Forge', description: 'Base de conocimiento de la IA', color: '#FF002C', isSystem: true, tenantId: tenantId || null }
            });
          }
          
          await prisma.mediaFile.create({
            data: {
              tenantId: tenantId || null,
              folderId: folder.id,
              name: `${title}.txt`,
              originalName: `${title}.txt`,
              mimeType: 'text/plain',
              size: textContent.length,
              url: 'local://ai-doctrine',
              aiSummary: textContent
            }
          });
          resultMsg = `Conocimiento guardado exitosamente en la carpeta 'Doctrina Forge'.`;
        } catch (err: any) {
          resultMsg = `Error al guardar doctrina: ${err.message}`;
        }
        result = await chat.sendMessage(`Resultado (save_ai_knowledge): ${resultMsg}`);
        
      } else if (call.name === "extract_youtube_transcript") {
        const { url } = call.args as any;
        await prisma.hermesMessage.update({ where: { id: processingMsgId }, data: { content: `🎥 [Plugin: YouTube] Extrayendo video...` } });
        
        let transcriptText = "";
        try {
          const transcript = await YoutubeTranscript.fetchTranscript(url);
          transcriptText = transcript.map((t: any) => `[${(t.offset / 1000).toFixed(0)}s]: ${t.text}`).join('\n');
          if (transcriptText.length > 25000) transcriptText = transcriptText.substring(0, 25000) + '...';
        } catch (err: any) {
          transcriptText = `Error: ${err.message}`;
        }
        result = await chat.sendMessage(`Resultado (extract_youtube_transcript):

${transcriptText}

Analiza esto y decide el siguiente paso.`);
        
      } else if (call.name === "query_crm_memory") {
        const { entity, query } = call.args as any;
        await prisma.hermesMessage.update({ where: { id: processingMsgId }, data: { content: `🧠 [Plugin: Memoria CRM] Buscando "${query}"...` } });
        
        let resultsText = "";
        try {
            if (entity === 'contacts') {
                const contacts = await prisma.contact.findMany({
                    where: { OR: [ { name: { contains: query, mode: 'insensitive' } }, { company: { contains: query, mode: 'insensitive' } } ] }, take: 10
                });
                resultsText = contacts.length ? JSON.stringify(contacts) : "No hay contactos.";
            } else if (entity === 'social_posts') {
                const posts = await prisma.socialPost.findMany({
                    where: { OR: [ { title: { contains: query, mode: 'insensitive' } }, { content: { contains: query, mode: 'insensitive' } } ] }, take: 10
                });
                resultsText = posts.length ? JSON.stringify(posts) : "No hay posts.";
            } else if (entity === 'files') {
                const files = await prisma.mediaFile.findMany({
                    where: { OR: [ { name: { contains: query, mode: 'insensitive' } }, { aiSummary: { contains: query, mode: 'insensitive' } } ] }, take: 10
                });
                resultsText = files.length ? JSON.stringify(files.map(f => ({ nombre: f.name, contenido: f.aiSummary || 'Archivo multimedia (sin texto)' }))) : "No hay archivos o doctrinas.";
            }
        } catch (err: any) {
            resultsText = `Error: ${err.message}`;
        }
        result = await chat.sendMessage(`Resultado (query_crm_memory):

${resultsText}`);
      }

      currentResponse = result.response;
      finalContent = currentResponse.text();
    }

    await prisma.hermesMessage.update({
      where: { id: processingMsgId },
      data: {
        content: finalContent || 'Operación completada sin mensaje adicional.',
        workerStatus: 'completed'
      }
    });

  } catch (err: any) {
    console.error("Agentic Loop Error:", err);
    if (processingMsgId) {
      await prisma.hermesMessage.update({
        where: { id: processingMsgId },
        data: {
          content: `Error crítico en el proceso Agéntico: ${err.message}`,
          workerStatus: 'error'
        }
      });
    }
  }
}
