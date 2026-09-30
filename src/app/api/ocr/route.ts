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
    const { frontImageUrl, backImageUrl, contactId } = body;

    if (!frontImageUrl) {
      return NextResponse.json({ success: false, error: 'Front card image is required' }, { status: 400 });
    }

    let parsedData: any = {
      name: '',
      title: '',
      company: '',
      email: '',
      phone: '',
      location: '',
      website: ''
    };

    let extractedText = '';

    if (genAI && frontImageUrl.startsWith('data:image')) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const mimeType = frontImageUrl.substring(5, frontImageUrl.indexOf(';'));
        const imagePart = base64ToGenerativePart(frontImageUrl, mimeType);
        
        const prompt = `Analiza esta tarjeta de presentación (business card). Extrae el texto completo y luego genera un JSON estricto con los siguientes campos: name, title, company, email, phone, location, website. Si un campo no existe, déjalo vacío. Devuelve SOLAMENTE el JSON, sin markdown ni backticks.`;
        
        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        
        parsedData = JSON.parse(responseText);
        extractedText = JSON.stringify(parsedData);
      } catch (e: any) {
        console.error("OCR Gemini Error:", e);
      }
    } else {
      // Fallback si la imagen es una URL de internet en lugar de base64 (para las demo cards)
      if (frontImageUrl.includes('unsplash')) {
        parsedData = {
          name: 'Demo User',
          title: 'CEO',
          company: 'Acme Corp',
          email: 'demo@acme.com',
          phone: '+1 555 1234',
          location: 'San Francisco, CA'
        };
      }
    }

    const card = await prisma.businessCard.create({
      data: {
        contactId: contactId || null,
        frontImageUrl,
        backImageUrl: backImageUrl || null,
        extractedTextFront: extractedText,
        extractedTextBack: '',
        parsedData: JSON.stringify(parsedData),
        parsedDataJson: JSON.stringify(parsedData),
      },
    });

    return NextResponse.json({ success: true, card, parsedData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
