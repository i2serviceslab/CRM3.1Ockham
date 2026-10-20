import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiKey = process.env.GEMINI_API_KEY || '';
const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

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
    const { contactId, audioDataUrl, durationSeconds, transcript } = body;

    if (!contactId || !audioDataUrl) {
      return NextResponse.json({ success: false, error: 'Contact ID and audio data are required' }, { status: 400 });
    }

    let finalTranscript = transcript || '';
    let summary = '';
    let sentiment = 'neutral';

    if (process.env.OPENAI_API_KEY && audioDataUrl && audioDataUrl.startsWith('data:audio')) {
      try {
        if (!finalTranscript) {
          const base64Raw = audioDataUrl.split(',')[1] || audioDataUrl;
          const buffer = Buffer.from(base64Raw, 'base64');
          const blob = new Blob([buffer], { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('file', blob, 'voicenote.webm');
          formData.append('model', 'whisper-1');
          formData.append('response_format', 'text');
          formData.append('language', 'es');

          const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
            body: formData,
          });
          if (whisperRes.ok) {
            finalTranscript = (await whisperRes.text()).trim();
          }
        }
        if (finalTranscript) {
          const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              response_format: { type: 'json_object' },
              messages: [
                {
                  role: 'system',
                  content: 'Actúa como un experto analizador de reuniones corporativas para Copper Giant Resources CRM. Analiza la transcripción y devuelve un JSON estricto con: "summary" (resumen ejecutivo de 2 líneas de los puntos clave) y "sentiment" (positivo, neutral o negativo).',
                },
                { role: 'user', content: finalTranscript },
              ],
              temperature: 0.2,
            }),
          });
          if (gptRes.ok) {
            const gptData = await gptRes.json();
            const parsed = JSON.parse(gptData.choices?.[0]?.message?.content || '{}');
            summary = parsed.summary || '';
            sentiment = (parsed.sentiment || 'neutral').toLowerCase();
          }
        }
      } catch (e) {
        console.error('OpenAI Audio Error:', e);
      }
    }

    if (!summary && genAI && audioDataUrl && audioDataUrl.startsWith('data:audio')) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
        const mimeType = audioDataUrl.substring(5, audioDataUrl.indexOf(';'));
        const audioPart = base64ToGenerativePart(audioDataUrl, mimeType);
        
        const prompt = `Actúa como un experto analizador de reuniones corporativas para un CRM. Escucha el siguiente audio y devuelve un JSON estricto con: "transcript" (la transcripción literal del audio), "summary" (un resumen ejecutivo de 2 líneas de los puntos clave) y "sentiment" (positivo, neutral o negativo).`;
        
        const result = await model.generateContent([prompt, audioPart]);
        const responseText = result.response.text();
        const parsed = JSON.parse(responseText);
        
        finalTranscript = parsed.transcript || finalTranscript;
        summary = parsed.summary || '';
        sentiment = (parsed.sentiment || 'neutral').toLowerCase();
      } catch (e) {
        console.error('Gemini Audio Error:', e);
      }
    }

    if (!finalTranscript) {
       finalTranscript = 'Audio grabado en el CRM (sin transcripción).';
    }

    const voiceNote = await prisma.voiceNote.create({
      data: {
        contactId,
        audioDataUrl,
        durationSeconds: durationSeconds || 0,
        transcript: `[RESUMEN IA]: ${summary}\n\n[TRANSCRIPCIÓN]: ${finalTranscript}`,
      },
    });

    // Synthesize updated AI Executive Briefing fields
    const transcriptExcerpt = summary || finalTranscript.slice(0, 120);
    const newIcebreaker = `En nota de voz reciente: "${transcriptExcerpt}..."`;
    const newStrategicContext = `Inteligencia de voz procesada: ${summary}. Sentimiento detectado: ${sentiment}.`;

    await prisma.contact.update({
      where: { id: contactId },
      data: {
        dynamicIcebreaker: newIcebreaker,
        strategicContext: newStrategicContext,
        leadScore: { increment: sentiment === 'positivo' || sentiment === 'positive' ? 10 : 5 },
      },
    });

    // Add activity to timeline
    await prisma.timelineActivity.create({
      data: {
        contactId,
        type: 'VOICE_NOTE',
        title: 'Nota de Voz Analizada (IA)',
        description: `Sentimiento: ${sentiment}. Resumen: ${summary}`,
      },
    });

    return NextResponse.json({ success: true, voiceNote });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
