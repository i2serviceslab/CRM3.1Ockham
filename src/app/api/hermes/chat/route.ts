import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini if key exists
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

    // 1. Create or verify session
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

    // 2. Save User Message in CRM Database
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

    // 3. Process with Gemini in the background
    if (apiKey) {
      processGeminiResponse(targetSessionId, promptText, worker).catch(console.error);
    } else {
      // Mock warning if no API key is set
      await prisma.hermesMessage.create({
        data: {
          sessionId: targetSessionId,
          role: 'assistant',
          content: '⚠️ No se ha configurado la variable de entorno `GEMINI_API_KEY`. Por favor, añádela en EasyPanel para activar la IA.',
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

async function processGeminiResponse(sessionId: string, promptText: string, worker: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Create a temporary processing message
    const processingMsg = await prisma.hermesMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: 'Analizando información...',
        workerName: worker,
        workerStatus: 'running'
      }
    });

    let systemInstruction = "Eres Hermes, el agente de Inteligencia Privada de Copper Giant. Responde de forma concisa, corporativa y estratégica.";
    if (worker === 'LEAD_SCORING') systemInstruction += " Tu tarea es calificar al lead y extraer información de contacto útil.";
    if (worker === 'DATA_PARSER') systemInstruction += " Tu tarea es estructurar los datos desordenados en formato claro.";

    const fullPrompt = `${systemInstruction}\n\nUsuario: ${promptText}\nHermes:`;
    const result = await model.generateContent(fullPrompt);
    const responseText = result.response.text();

    // Update the message with the final response
    await prisma.hermesMessage.update({
      where: { id: processingMsg.id },
      data: {
        content: responseText,
        workerStatus: 'completed'
      }
    });

  } catch (err: any) {
    console.error("Gemini AI Error:", err);
    await prisma.hermesMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: `Error al procesar con Gemini: ${err.message}`,
        workerName: worker,
        workerStatus: 'error'
      }
    });
  }
}
