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
    const prompt = `Analiza esta tarjeta de presentación (business card). Extrae el texto completo y luego genera un JSON estricto con los siguientes campos: name, title, company, email, phone, location, website. Si un campo no existe, déjalo vacío. Devuelve SOLAMENTE el JSON, sin markdown ni backticks.`;

    if (process.env.OPENAI_API_KEY && frontImageUrl.startsWith('data:image')) {
      try {
        const oaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
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
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  { type: 'image_url', image_url: { url: frontImageUrl } },
                ],
              },
            ],
            temperature: 0,
          }),
        });
        if (oaiRes.ok) {
          const oaiData = await oaiRes.json();
          const responseText = (oaiData.choices?.[0]?.message?.content || '{}').trim();
          parsedData = JSON.parse(responseText);
          extractedText = JSON.stringify(parsedData);
        }
      } catch (e: any) {
        console.error('OCR OpenAI Vision Error:', e);
      }
    }

    if (!extractedText && genAI && frontImageUrl.startsWith('data:image')) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const mimeType = frontImageUrl.substring(5, frontImageUrl.indexOf(';'));
        const imagePart = base64ToGenerativePart(frontImageUrl, mimeType);
        
        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        
        parsedData = JSON.parse(responseText);
        extractedText = JSON.stringify(parsedData);
      } catch (e: any) {
        console.error("OCR Gemini Error:", e);
      }
    } else if (!extractedText) {
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
