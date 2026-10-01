import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

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

// Aumentamos el límite de tamaño de la ruta para Next.js (necesario para audios grandes)
export const maxDuration = 300; // 5 minutos de timeout
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    let mimeType = request.headers.get('Content-Type') || 'audio/webm';
    // Gemini API throws 404 if the mime type is unsupported for generateContent (like m4a)
    if (mimeType.includes('m4a') || mimeType.includes('x-m4a')) {
      mimeType = 'audio/mp4'; // Map to a supported container format
    } else if (mimeType === 'application/octet-stream') {
      mimeType = 'audio/mp3'; // Fallback guess
    }
    const durationSeconds = request.headers.get('X-Duration-Seconds') || '0';
    const tenantId = request.headers.get('X-Tenant-Id') || null;

    const arrayBuffer = await request.arrayBuffer();
    
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return NextResponse.json({ success: false, error: 'Audio payload is empty or too large.' }, { status: 400 });
    }

    if (!genAI) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY is missing' }, { status: 500 });
    }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const buffer = Buffer.from(arrayBuffer);
    
    const prompt = `Actúa como un secretario corporativo avanzado. Escucha esta reunión grupal.
    Identifica a los diferentes interlocutores y llámalos por su nombre si se mencionan.
    Devuelve estrictamente un JSON con esta estructura exacta:
    {
      "transcript": "Speaker 1 (Nombre si se sabe): hola... 
Speaker 2: ...",
      "summary": "Resumen ejecutivo de 3 líneas",
      "actionItems": ["Tarea 1", "Tarea 2"],
      "aiDoctrines": [
        { "title": "Nombre de la regla o parámetro", "rule": "Descripción detallada de la regla que la IA debe aprender a partir de las decisiones tomadas en esta reunión." }
      ]
    }
    MUY IMPORTANTE: Solo extrae "aiDoctrines" si en la reunión se discuten lineamientos, reglas de comunicación, estrategias de la empresa o parámetros que la IA debería memorizar para su funcionamiento futuro. Si no hay nada, devuelve un array vacío [].`;
    
    let responseText = '';
    
    if (buffer.length > 100 * 1024) {
      const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY || '');
      const tempFilePath = path.join(os.tmpdir(), `meeting_${Date.now()}.webm`);
      fs.writeFileSync(tempFilePath, buffer);
      
      try {
        const uploadResponse = await fileManager.uploadFile(tempFilePath, {
          mimeType,
          displayName: "Massive Meeting Recording",
        });
        
        let fileState = await fileManager.getFile(uploadResponse.file.name);
        while (fileState.state === "PROCESSING") {
          console.log('File is processing, waiting 5 seconds...');
          await new Promise((resolve) => setTimeout(resolve, 5000));
          fileState = await fileManager.getFile(uploadResponse.file.name);
        }
        
        if (fileState.state === "FAILED") {
          throw new Error("Gemini failed to process the uploaded audio file.");
        }
        
        const audioPart = {
          fileData: {
            mimeType: uploadResponse.file.mimeType,
            fileUri: uploadResponse.file.uri
          }
        };
        
        // USE NATIVE FETCH TO BYPASS SDK BUG
        const requestBody = {
          contents: [{
            parts: [
              { text: prompt },
              { fileData: { mimeType: uploadResponse.file.mimeType, fileUri: uploadResponse.file.uri } }
            ]
          }]
        };
        
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        
        if (!res.ok) {
          const errText = await res.text();
          console.error("Fetch API Error:", errText);
          throw new Error(`Google API Error: ${res.status} - ${errText}`);
        }
        
        const jsonRes = await res.json();
        responseText = jsonRes.candidates[0].content.parts[0].text;

      } finally {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      }
    } else {
      const base64Data = buffer.toString('base64');
      const requestBody = {
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: mimeType, data: base64Data } }
          ]
        }]
      };
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (!res.ok) {
        const errText = await res.text();
        console.error("Fetch API Error:", errText);
        throw new Error(`Google API Error: ${res.status} - ${errText}`);
      }
      
      const jsonRes = await res.json();
      responseText = jsonRes.candidates[0].content.parts[0].text;
    }
    responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", responseText);
      throw new Error("Gemini did not return valid JSON format.");
    }

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
