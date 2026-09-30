import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, tone = 'professional', prompt: userPrompt } = body;

    let generatedCopy = '';

    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        let systemPrompt = `You are the Expert Investor Relations (IR) Director at Copper Giant (TSX: CGNT). 
You write highly engaging, strategic social media posts about Copper Giant, the Santa Ana high-grade silver project in Colombia, the global silver deficit, and clean tech (solar panels, EVs). 
The tone should be: ${tone}.`;

        const prompt = `${systemPrompt}\n\nUser request: ${userPrompt || title || 'Write a great update about our progress.'}\nWrite ONLY the social media post content. Do not include quotes or conversational filler.`;
        
        const result = await model.generateContent(prompt);
        generatedCopy = result.response.text().trim();
      } catch (e) {
        console.error("Social AI Gemini Error:", e);
        generatedCopy = `📊 *Copper Giant* | ${title || 'Exploration Update'}\n\nWe are pleased to share progress at our flagship high-grade primary silver project, Santa Ana, in Colombia.`;
      }
    } else {
      // Fallback if no API key
      generatedCopy = `📊 *Copper Giant* | ${title || 'Exploration Update'}\n\nWe are pleased to share progress at our flagship high-grade primary silver project, Santa Ana, in Colombia.`;
    }

    await prisma.socialAuditLog.create({
      data: {
        action: 'generate_ai_copy',
        username: 'Copper Giant Admin',
        entityType: 'post',
        details: `Generated content with tone ${tone}`,
      },
    });

    return NextResponse.json({ success: true, generatedCopy });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
