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
    
    const bodyText = await request.text();
    const body = JSON.parse(bodyText);
    const finalPath = body.finalPath;
    let mimeType = body.mimeType || 'audio/webm';
    
    // Fallback file extension logic
    let ext = '.webm';
    if (mimeType.includes('mp4') || mimeType.includes('m4a') || mimeType.includes('x-m4a')) ext = '.m4a';
    else if (mimeType.includes('mp3')) ext = '.mp3';
    else if (mimeType.includes('wav')) ext = '.wav';
    else if (mimeType.includes('ogg')) ext = '.ogg';

    if (!finalPath) {
      return NextResponse.json({ success: false, error: 'Missing assembled file path' }, { status: 400 });
    }
    const fs = require('fs');
    if (!fs.existsSync(finalPath)) {
      return NextResponse.json({ success: false, error: 'Assembled file not found' }, { status: 400 });
    }
    const buffer = fs.readFileSync(finalPath);
    const receivedMegabytes = (buffer.byteLength / (1024 * 1024)).toFixed(2);

    // 1. PIVOT TO OPENAI WHISPER FOR BULLETPROOF TRANSCRIPTION
    const openAIKey = process.env.OPENAI_API_KEY;
    if (!openAIKey) {
      return NextResponse.json({ success: false, error: 'OPENAI_API_KEY is missing' }, { status: 500 });
    }

    // TRANCODE AND COMPRESS USING FFMPEG
    // This normalizes ALL obscure formats (AMR, OPUS, WMA, broken M4A) into a clean MP3
    
    const path = require('path');
    const os = require('os');
    const { execSync } = require('child_process');

    const tempInput = path.join(os.tmpdir(), `input_${Date.now()}`);
    const tempOutput = path.join(os.tmpdir(), `output_${Date.now()}.mp3`);
    
    fs.writeFileSync(tempInput, buffer);
    const segmentDir = path.join(os.tmpdir(), `segments_${Date.now()}`);
    fs.mkdirSync(segmentDir, { recursive: true });

    try {
      // 1. Convert to a single highly compressed MP3
      execSync(`ffmpeg -y -i "${tempInput}" -ar 16000 -ac 1 -b:a 16k "${tempOutput}"`, { stdio: 'pipe' });
      // 2. Split into 15-minute chunks (900 seconds) to prevent OpenAI Whisper Timeouts
      execSync(`ffmpeg -i "${tempOutput}" -f segment -segment_time 900 -c copy "${path.join(segmentDir, 'chunk_%03d.mp3')}"`, { stdio: 'pipe' });
    } catch (e: any) {
      if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
      if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
      const stderr = e.stderr ? e.stderr.toString() : e.message;
      throw new Error(`FFmpeg Error (Recibidos ${receivedMegabytes} MB): ` + stderr.slice(-300));
    }
    
    // Clean up original temp files
    if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
    if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);

    // Read all generated chunk files
    const chunks = fs.readdirSync(segmentDir).filter((f: string) => f.endsWith('.mp3')).sort();
    let transcriptText = "";

    // Process each chunk sequentially
    for (const chunkFile of chunks) {
      const chunkPath = path.join(segmentDir, chunkFile);
      const mp3Buffer = fs.readFileSync(chunkPath);
      const blob = new Blob([mp3Buffer], { type: 'audio/mp3' });
      
      const formData = new FormData();
      formData.append('file', blob, chunkFile);
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'text');
      formData.append('language', 'es'); 

      try {
        const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${openAIKey}` },
          body: formData,
        });

        if (!whisperRes.ok) {
          const errText = await whisperRes.text();
          throw new Error(`OpenAI Whisper Error: ${whisperRes.status} - ${errText}`);
        }

        const text = await whisperRes.text();
        transcriptText += text + " ";
      } finally {
        fs.unlinkSync(chunkPath); // clean up segment after uploading
      }
    }
    
    if (fs.existsSync(segmentDir)) fs.rmdirSync(segmentDir); // clean dir

    // 2. USE GPT-4o TO EXTRACT ACTION ITEMS AND DOCTRINES FROM TRANSCRIPT
    // Bypassing Gemini completely to avoid undocumented 404 model errors
    const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openAIKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Actúa como un secretario corporativo avanzado. Lee esta transcripción de una reunión grupal. Identifica a los diferentes interlocutores si es posible. Devuelve estrictamente un JSON con esta estructura exacta: { "transcript": "...", "summary": "Resumen ejecutivo de 3 líneas", "actionItems": ["Tarea 1"], "aiDoctrines": [ { "title": "Regla", "rule": "Descripción" } ] }' },
          { role: 'user', content: `Transcripción:
${transcriptText.slice(0, 300000)}` } // Safely cap at 300k chars just in case
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!gptRes.ok) {
      const errText = await gptRes.text();
      throw new Error(`OpenAI GPT-4o Error: ${gptRes.status} - ${errText}`);
    }

    const gptData = await gptRes.json();
    let parsed;
    try {
      parsed = JSON.parse(gptData.choices[0]?.message?.content || '{}');
    } catch (e) {
      throw new Error("GPT-4o did not return valid JSON format.");
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
        data: { name: 'Actas de Reuniones', color: '#00E5FF', tenantId: tenantId || null }
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
          data: { name: 'Doctrina Forge', color: '#FF002C', tenantId: tenantId || null }
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
