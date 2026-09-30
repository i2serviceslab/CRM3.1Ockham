import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import * as cheerio from 'cheerio';

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
      processAgenticLoop(targetSessionId, promptText, worker).catch(console.error);
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
async function processAgenticLoop(sessionId: string, promptText: string, worker: string) {
  let processingMsgId = '';
  try {
    // Create "thinking" message
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
          }
        ]
      }],
      systemInstruction: `Eres Forge, el Agente Autónomo de Inteligencia Privada de Copper Giant. 
      No eres un simple chatbot, tienes "ojos y manos" mediante herramientas (tools).
      Si el usuario te pasa un enlace o te pide revisar una web, SIEMPRE usa la herramienta 'scrape_website'.
      Responde de forma ejecutiva, corporativa y estratégica.`
    });

    const chat = model.startChat();
    let result = await chat.sendMessage([{ text: promptText }]);
    let response = result.response;
    let finalContent = response.text();

    // Check if the Agent decided to use a Tool (Plugin)
    const calls = response.functionCalls();
    if (calls && calls.length > 0) {
      const call = calls[0];
      
      if (call.name === "scrape_website") {
        const urlArgs = call.args as any;
        const targetUrl = urlArgs.url;
        
        await prisma.hermesMessage.update({
          where: { id: processingMsgId },
          data: { content: `👁️ [Plugin: Scraping] Leyendo sitio web: ${targetUrl}...` }
        });

        // Execute Tool
        let extractedText = "";
        try {
          const res = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
          const html = await res.text();
          const $ = cheerio.load(html);
          $('script, style, noscript, nav, footer').remove();
          extractedText = $('body').text().replace(/\s+/g, ' ').trim();
          if (extractedText.length > 15000) extractedText = extractedText.substring(0, 15000) + '...'; // Limit token size
        } catch (err: any) {
          extractedText = `Error al leer la web: ${err.message}`;
        }

        // Return Tool Result to the Agent as a standard user message to avoid 'function' role 400 errors
        result = await chat.sendMessage(`Resultado extraído de la web (scrape_website):

${extractedText}

Con base en esta información, responde a mi solicitud original.`);
        
        finalContent = result.response.text();
      }
    }

    // Save final response
    await prisma.hermesMessage.update({
      where: { id: processingMsgId },
      data: {
        content: finalContent,
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
