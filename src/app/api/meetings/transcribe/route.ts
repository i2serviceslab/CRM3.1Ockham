import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Aumentamos el límite de tamaño de la ruta para Next.js
export const maxDuration = 300; 
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const durationSeconds = request.headers.get('X-Duration-Seconds') || '0';
    const tenantId = request.headers.get('X-Tenant-Id') || null;
    let mimeType = request.headers.get('Content-Type') || 'audio/webm';
    
    // Fallback file extension logic
    let ext = '.webm';
    if (mimeType.includes('mp4') || mimeType.includes('m4a') || mimeType.includes('x-m4a')) ext = '.m4a';
    else if (mimeType.includes('mp3')) ext = '.mp3';
    else if (mimeType.includes('wav')) ext = '.wav';
    else if (mimeType.includes('ogg')) ext = '.ogg';

    const arrayBuffer = await request.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return NextResponse.json({ success: false, error: 'Audio payload is empty' }, { status: 400 });
    }
    const buffer = Buffer.from(arrayBuffer);

    // 1. PIVOT TO OPENAI WHISPER FOR BULLETPROOF TRANSCRIPTION
    const openAIKey = process.env.OPENAI_API_KEY;
    if (!openAIKey) {
      return NextResponse.json({ success: false, error: 'OPENAI_API_KEY is missing' }, { status: 500 });
    }

    const blob = new Blob([buffer], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, `audio${ext}`);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'text');
    formData.append('language', 'es'); // Force Spanish or allow auto

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAIKey}` },
      body: formData,
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      console.error("Whisper API Error:", errText);
      throw new Error(`OpenAI Whisper Error: ${whisperRes.status} - ${errText}`);
    }

    const transcriptText = await whisperRes.text();

    // 2. USE GEMINI FLASH TO EXTRACT ACTION ITEMS AND DOCTRINES FROM TRANSCRIPT
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    
    const prompt = `Actúa como un secretario corporativo avanzado. Lee esta transcripción de una reunión grupal.
    Identifica a los diferentes interlocutores si es posible.
    Devuelve estrictamente un JSON con esta estructura exacta:
    {
      "transcript": "Transcripción de la reunión",
      "summary": "Resumen ejecutivo de 3 líneas",
      "actionItems": ["Tarea 1", "Tarea 2"],
      "aiDoctrines": [
        { "title": "Nombre de la regla o parámetro", "rule": "Descripción de la regla que la IA debe aprender." }
      ]
    }
    
    Transcripción:
    ${transcriptText}`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }]
    };
    
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Google API Error: ${geminiRes.status} - ${errText}`);
    }

    const jsonRes = await geminiRes.json();
    let responseText = jsonRes.candidates[0].content.parts[0].text;
    responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      throw new Error("Gemini did not return valid JSON format.");
    }

    // Replace transcript with the original full Whisper transcript for accuracy
    parsed.transcript = transcriptText;

    // Save Action Items to Tasks
    if (parsed.actionItems && Array.isArray(parsed.actionItems)) {
      for (const item of parsed.actionItems) {
        await prisma.task.create({
          data: {
            tenantId: tenantId || null,
            title: item.slice(0, 100),
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
        data: { name: 'Actas de Reuniones', description: 'Historial de grabaciones', color: '#00E5FF', isSystem: true, tenantId: tenantId || null }
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
          data: { name: 'Doctrina Forge', description: 'Base de conocimiento de la IA', color: '#FF002C', isSystem: true, tenantId: tenantId || null }
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
