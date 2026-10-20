import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiKey = process.env.GEMINI_API_KEY || '';
const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, tone = 'professional', prompt: userPrompt } = body;

    let generatedCopy = '';
    const systemPrompt = `You are the Expert Investor Relations (IR) Director at Copper Giant Resources Corp. (TSXV: CGNT | OTCQX: CGNRF | FRA: 29H0). 
You write highly engaging, strategic social media posts about Copper Giant Resources, the flagship Mocoa Copper-Molybdenum Porphyry project in Colombia (1.60 Bt Inferred & 290 Mt Indicated NI 43-101 MRE), the global copper supply deficit, and critical electrification infrastructure. 
The tone should be: ${tone}.`;

    const fullUserPrompt = `${userPrompt || title || 'Write a high-impact investor update about our Mocoa Copper-Molybdenum Project progress.'}\nWrite ONLY the social media post content. Do not include quotes or conversational filler.`;

    if (process.env.OPENAI_API_KEY) {
      try {
        const oaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: fullUserPrompt },
            ],
            temperature: 0.7,
          }),
        });
        if (oaiRes.ok) {
          const oaiData = await oaiRes.json();
          generatedCopy = (oaiData.choices?.[0]?.message?.content || '').trim();
        }
      } catch (e) {
        console.error('Social AI OpenAI Error:', e);
      }
    }

    if (!generatedCopy && genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
        const result = await model.generateContent(`${systemPrompt}\n\nUser request: ${fullUserPrompt}`);
        generatedCopy = result.response.text().trim();
      } catch (e) {
        console.error('Social AI Gemini Error:', e);
      }
    }

    if (!generatedCopy) {
      generatedCopy = `📊 *Copper Giant Resources* (TSXV: CGNT | OTCQX: CGNRF) | ${title || 'Mocoa Exploration Update'}\n\nWe are pleased to share continued resource expansion progress at our flagship Mocoa Copper-Molybdenum Porphyry Project in Colombia (1.60 Bt Inferred & 290 Mt Indicated). #Copper #Mining #CGNT #CriticalMinerals`;
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
