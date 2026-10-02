import re

with open('src/app/api/meetings/transcribe/route.ts', 'r') as f:
    code = f.read()

old_logic = """    // 2. USE GEMINI FLASH TO EXTRACT ACTION ITEMS AND DOCTRINES FROM TRANSCRIPT
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    
    const prompt = `Actúa como un secretario corporativo avanzado. Lee esta transcripción de una reunión grupal.
    Identifica a los diferentes interlocutores si es posible.
    Devuelve estrictamente un JSON con esta estructura exacta:
    {
      "transcript": "Transcripción de la reunión",
      "summary": "Resumen ejecutivo de 3 líneas",
      "actionItems": ["Tarea 1", "Tarea 2"],
      "aiDoctrines": [
        { "title": "Nombre de la regla o parámetro", "rule": "Descripción de la regla que la IA debe aprender." }
      ]
    }
    
    Transcripción:
    ${transcriptText}`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }]
    };
    
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Google API Error: ${geminiRes.status} - ${errText}`);
    }

    const jsonRes = await geminiRes.json();
    let responseText = jsonRes.candidates[0].content.parts[0].text;
    responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      throw new Error("Gemini did not return valid JSON format.");
    }"""

new_logic = """    // 2. USE GPT-4o TO EXTRACT ACTION ITEMS AND DOCTRINES FROM TRANSCRIPT
    // Bypassing Gemini completely to avoid undocumented 404 model errors
    const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openAIKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Actúa como un secretario corporativo avanzado. Lee esta transcripción de una reunión grupal. Identifica a los diferentes interlocutores si es posible. Devuelve estrictamente un JSON con esta estructura exacta: { "transcript": "...", "summary": "Resumen ejecutivo de 3 líneas", "actionItems": ["Tarea 1"], "aiDoctrines": [ { "title": "Regla", "rule": "Descripción" } ] }' },
          { role: 'user', content: `Transcripción:\n${transcriptText.slice(0, 300000)}` } // Safely cap at 300k chars just in case
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
    }"""

code = code.replace(old_logic, new_logic)

with open('src/app/api/meetings/transcribe/route.ts', 'w') as f:
    f.write(code)

print("Swapped Gemini for GPT-4o!")
