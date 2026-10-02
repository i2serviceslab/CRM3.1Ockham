import re

with open('src/components/contacts/VoiceNoteRecorder.tsx', 'r') as f:
    code = f.read()

# Update the frontend button logic
old_ui = """                onClick={() => {
                  const sampleContact = contacts.find((c) => c.id === selectedContactId);
                  const name = sampleContact?.name || 'El inversionista';
                  const aiTakeaway =
                    `🎙️ RESUMEN EJECUTIVO EXTRAÍDO POR IA:\\n` +
                    `• Sentimiento: Alto Interés Minero (Interés en Santa Ana - Leyes de Plata)\\n` +
                    `• Puntos Clave: ${name} solicitó el informe técnico NI 43-101 y mostró interés en co-invertir en la fase de exploración Q3.\\n` +
                    `• Tarea de Seguimiento: Despachar informe de ensayos geológicos y agendar videollamada.`;
                  setTranscript(aiTakeaway);
                }}
                className="px-3.5 py-1.5 rounded-full bg-red-500/20 text-[#FF002C] border border-red-500/40 font-black text-xs hover:bg-red-500 hover:text-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>⚡ Extraer Puntos Clave con IA</span>"""

new_ui = """                onClick={handleSaveVoiceNote}
                className="px-3.5 py-1.5 rounded-full bg-red-500/20 text-[#FF002C] border border-red-500/40 font-black text-xs hover:bg-red-500 hover:text-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                disabled={saving}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{saving ? '⚡ Analizando Audio...' : '⚡ Guardar y Extraer con IA'}</span>"""
code = code.replace(old_ui, new_ui)

with open('src/components/contacts/VoiceNoteRecorder.tsx', 'w') as f:
    f.write(code)

with open('src/app/api/voicenotes/route.ts', 'r') as f:
    api_code = f.read()

# Rewrite backend route to use Gemini
new_api_code = """import { NextResponse } from 'next/server';
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
    const { contactId, audioDataUrl, durationSeconds, transcript } = body;

    if (!contactId || !audioDataUrl) {
      return NextResponse.json({ success: false, error: 'Contact ID and audio data are required' }, { status: 400 });
    }

    let finalTranscript = transcript || '';
    let summary = '';
    let sentiment = 'neutral';

    if (genAI && audioDataUrl && audioDataUrl.startsWith('data:audio')) {
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
        transcript: `[RESUMEN IA]: ${summary}\\n\\n[TRANSCRIPCIÓN]: ${finalTranscript}`,
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
"""
with open('src/app/api/voicenotes/route.ts', 'w') as f:
    f.write(new_api_code)

print("Audio processing fixed!")
