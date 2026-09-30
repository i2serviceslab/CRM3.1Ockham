import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { frontImageUrl, backImageUrl, contactId } = body;

    if (!frontImageUrl) {
      return NextResponse.json({ success: false, error: 'Front card image is required' }, { status: 400 });
    }

    const extractedFrontText = body.extractedFrontText || 'Business Card Front Text';
    const extractedBackText = body.extractedBackText || 'Business Card Back Text';

    const emailMatch = (extractedFrontText + ' ' + extractedBackText).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = (extractedFrontText + ' ' + extractedBackText).match(/(\+?\d{1,4}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    
    let parsedData: any = {
      email: emailMatch ? emailMatch[0] : null,
      phone: phoneMatch ? phoneMatch[0] : null,
      rawFront: extractedFrontText,
      rawBack: extractedBackText,
    };

    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest", generationConfig: { responseMimeType: "application/json" } });
        const prompt = `You are an OCR text parser. Extract contact details from business card text into strict JSON format with these exact keys: "name", "title", "company", "email", "phone", "location", "website". 
Return ONLY valid JSON.
Front: ${extractedFrontText}
Back: ${extractedBackText}`;
        const result = await model.generateContent(prompt);
        const gptParsed = JSON.parse(result.response.text() || '{}');
        parsedData = { ...parsedData, ...gptParsed };
      } catch (e) {
        console.error("OCR Gemini Error:", e);
      }
    }

    const card = await prisma.businessCard.create({
      data: {
        contactId: contactId || null,
        frontImageUrl,
        backImageUrl: backImageUrl || null,
        extractedTextFront: extractedFrontText,
        extractedTextBack: extractedBackText,
        parsedData: JSON.stringify(parsedData),
        parsedDataJson: JSON.stringify(parsedData),
      },
    });

    return NextResponse.json({ success: true, card });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
