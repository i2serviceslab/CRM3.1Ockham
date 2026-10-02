import re

with open('src/app/api/meetings/transcribe/route.ts', 'r') as f:
    api_code = f.read()

# Replace the generation logic using regex to be safe
new_logic = """    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
    const buffer = Buffer.from(arrayBuffer);
    
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
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      }
    } else {
      const base64Data = buffer.toString('base64');
      const audioPart = {
        inlineData: {
          data: base64Data,
          mimeType
        }
      };
      result = await model.generateContent([prompt, audioPart]);
    }
    
    const responseText = result.response.text();"""

# We'll use regex to replace everything from `const model = ...` to `const responseText = result.response.text();`
pattern = re.compile(r'const model = genAI\.getGenerativeModel.*?const responseText = result\.response\.text\(\);', re.DOTALL)
api_code = pattern.sub(new_logic, api_code)

with open('src/app/api/meetings/transcribe/route.ts', 'w') as f:
    f.write(api_code)

print("File API correctly applied!")
