import re

with open('src/app/api/meetings/transcribe/route.ts', 'r') as f:
    api_code = f.read()

old_logic = """        try {
          result = await model.generateContent([prompt, audioPart]);
        } catch (e: any) {
          console.error("Flash failed, trying Pro:", e);
          const proModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
          result = await proModel.generateContent([prompt, audioPart]);
        }
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
    
    let responseText = result.response.text();"""

new_logic = """        // USE NATIVE FETCH TO BYPASS SDK BUG
        const requestBody = {
          contents: [{
            parts: [
              { text: prompt },
              { fileData: { mimeType: uploadResponse.file.mimeType, fileUri: uploadResponse.file.uri } }
            ]
          }]
        };
        
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        
        if (!res.ok) {
          const errText = await res.text();
          console.error("Fetch API Error:", errText);
          throw new Error(`Google API Error: ${res.status} - ${errText}`);
        }
        
        const jsonRes = await res.json();
        responseText = jsonRes.candidates[0].content.parts[0].text;

      } finally {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      }
    } else {
      const base64Data = buffer.toString('base64');
      const requestBody = {
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: mimeType, data: base64Data } }
          ]
        }]
      };
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (!res.ok) {
        const errText = await res.text();
        console.error("Fetch API Error:", errText);
        throw new Error(`Google API Error: ${res.status} - ${errText}`);
      }
      
      const jsonRes = await res.json();
      responseText = jsonRes.candidates[0].content.parts[0].text;
    }"""

api_code = api_code.replace(old_logic, new_logic)
api_code = api_code.replace("let result;", "let responseText = '';")

with open('src/app/api/meetings/transcribe/route.ts', 'w') as f:
    f.write(api_code)

print("Switched to Native Fetch!")
