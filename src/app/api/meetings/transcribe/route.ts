import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

function base64ToGenerativePart(base64Data: string, mimeType: string) {
  return {
    inlineData: {
      data: base64Data.split(',')[1] || base64Data,
      mimeType
    },
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { audioDataUrl, durationSeconds, tenantId } = body;

    if (!audioDataUrl) {
      return NextResponse.json({ success: false, error: 'Audio data is required' }, { status: 400 });
    }

    if (!genAI) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY is missing' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
    const mimeType = audioDataUrl.substring(5, audioDataUrl.indexOf(';'));
    const audioPart = base64ToGenerativePart(audioDataUrl, mimeType);
    
    const prompt = `Actúa como un secretario corporativo avanzado. Escucha esta reunión grupal.
    Identifica a los diferentes interlocutores y llámalos por su nombre si se mencionan.
    Devuelve estrictamente un JSON con esta estructura exacta:
    {
      "transcript": "Speaker 1 (Nombre si se sabe): hola... \\nSpeaker 2: ...",
      "summary": "Resumen ejecutivo de 3 líneas",
      "actionItems": ["Tarea 1", "Tarea 2"],
      "aiDoctrines": [
        { "title": "Nombre de la regla o parámetro", "rule": "Descripción detallada de la regla que la IA debe aprender a partir de las decisiones tomadas en esta reunión." }
      ]
    }
    MUY IMPORTANTE: Solo extrae "aiDoctrines" si en la reunión se discuten lineamientos, reglas de comunicación, estrategias de la empresa o parámetros que la IA debería memorizar para su funcionamiento futuro. Si no hay nada, devuelve un array vacío [].`;
    
    const result = await model.generateContent([prompt, audioPart]);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);

    // Save Action Items to Tasks
    if (parsed.actionItems && Array.isArray(parsed.actionItems)) {
      for (const item of parsed.actionItems) {
        await prisma.task.create({
          data: {
            tenantId: tenantId || null,
            title: item.slice(0, 100), // Trim title if too long
            description: `Tarea extraída de grabación de reunión. Detalles: ${item}`,
            priority: 'Medium',
            status: 'PENDING',
          }
        });
      }
    }

    // Save Meeting Minute to Vault
    let minutesFolder = await prisma.mediaFolder.findFirst({ where: { name: 'Actas de Reuniones', tenantId: tenantId || null } });
    if (!minutesFolder) {
      minutesFolder = await prisma.mediaFolder.create({
        data: { name: 'Actas de Reuniones', description: 'Historial de grabaciones y resúmenes de reuniones', color: '#00E5FF', isSystem: true, tenantId: tenantId || null }
      });
    }

    const meetingContent = JSON.stringify(parsed);
    const meetingTitle = `Reunión_${new Date().toISOString().split('T')[0]}_${Math.floor(Math.random() * 1000)}`;

    await prisma.mediaFile.create({
      data: {
        tenantId: tenantId || null,
        folderId: minutesFolder.id,
        name: `${meetingTitle}.json`,
        originalName: `${meetingTitle}.json`,
        mimeType: 'application/json',
        size: meetingContent.length,
        url: 'local://meeting-minutes',
        aiSummary: meetingContent
      }
    });

    // Save Doctrines to Vault
    if (parsed.aiDoctrines && Array.isArray(parsed.aiDoctrines)) {
      let folder = await prisma.mediaFolder.findFirst({ where: { name: 'Doctrina Forge' } });
      if (!folder) {
        folder = await prisma.mediaFolder.create({
          data: { name: 'Doctrina Forge', description: 'Base de conocimiento de la IA (Auto-generada)', color: '#FF002C', isSystem: true, tenantId: tenantId || null }
        });
      }

      for (const doc of parsed.aiDoctrines) {
        await prisma.mediaFile.create({
          data: {
            tenantId: tenantId || null,
            folderId: folder.id,
            name: `${doc.title}.txt`,
            originalName: `${doc.title}.txt`,
            mimeType: 'text/plain',
            size: doc.rule.length,
            url: 'local://ai-doctrine-meeting',
            aiSummary: doc.rule
          }
        });
      }
    }

    return NextResponse.json({ success: true, result: parsed });
  } catch (error: any) {
    console.error('Meeting Processing Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
