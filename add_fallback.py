import re

with open('src/app/api/meetings/transcribe/route.ts', 'r') as f:
    api_code = f.read()

old_logic = """        result = await model.generateContent([prompt, audioPart]);
      } finally {"""
new_logic = """        try {
          result = await model.generateContent([prompt, audioPart]);
        } catch (e: any) {
          console.error("Flash failed, trying Pro:", e);
          const proModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro", generationConfig: { responseMimeType: "application/json" } });
          result = await proModel.generateContent([prompt, audioPart]);
        }
      } finally {"""
api_code = api_code.replace(old_logic, new_logic)

with open('src/app/api/meetings/transcribe/route.ts', 'w') as f:
    f.write(api_code)

print("Fallback added!")
