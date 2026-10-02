import re

with open('src/app/api/meetings/transcribe/route.ts', 'r') as f:
    api_code = f.read()

# Add import for GoogleAIFileManager and fs
old_imports = """import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';"""

new_imports = """import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';
import path from 'path';
import os from 'os';"""
api_code = api_code.replace(old_imports, new_imports)

# Replace the generation logic
old_logic = """    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
    
    // Convert ArrayBuffer to Base64 for Gemini
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    
    const audioPart = {
      inlineData: {
        data: base64Data,
        mimeType
      }
    };
    
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
    
    const result = await model.generateContent([prompt, audioPart]);"""

new_logic = """    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = request.headers.get('Content-Type') || 'audio/webm';
    
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
    
    let result;
    
    // Gemini has a 20MB limit for inline base64 data.
    // For large files (like 2.5 hour meetings), we MUST use the File API.
    if (buffer.length > 15 * 1024 * 1024) {
      const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY || '');
      const tempFilePath = path.join(os.tmpdir(), `meeting_${Date.now()}.webm`);
      fs.writeFileSync(tempFilePath, buffer);
      
      try {
        const uploadResponse = await fileManager.uploadFile(tempFilePath, {
          mimeType,
          displayName: "Massive Meeting Recording",
        });
        
        const audioPart = {
          fileData: {
            mimeType: uploadResponse.file.mimeType,
            fileUri: uploadResponse.file.uri
          }
        };
        
        result = await model.generateContent([prompt, audioPart]);
      } finally {
        // Clean up temp file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    } else {
      // Small file, use inline base64
      const base64Data = buffer.toString('base64');
      const audioPart = {
        inlineData: {
          data: base64Data,
          mimeType
        }
      };
      result = await model.generateContent([prompt, audioPart]);
    }"""
api_code = api_code.replace(old_logic, new_logic)

with open('src/app/api/meetings/transcribe/route.ts', 'w') as f:
    f.write(api_code)

print("Switched to File API for massive files!")
