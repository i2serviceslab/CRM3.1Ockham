import re

with open('src/app/api/meetings/transcribe/route.ts', 'r') as f:
    api_code = f.read()

# 1. Remove JSON response type and use -latest models
api_code = api_code.replace(
    'const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });',
    'const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });'
)
api_code = api_code.replace(
    'const proModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro", generationConfig: { responseMimeType: "application/json" } });',
    'const proModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });'
)

# 2. Fix the JSON parsing to handle markdown blocks
old_parse = """    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);"""
new_parse = """    let responseText = result.response.text();
    responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", responseText);
      throw new Error("Gemini did not return valid JSON format.");
    }"""
api_code = api_code.replace(old_parse, new_parse)

# 3. Handle M4A / iOS Mime Types which Gemini rejects
old_mime = "const mimeType = request.headers.get('Content-Type') || 'audio/webm';"
new_mime = """let mimeType = request.headers.get('Content-Type') || 'audio/webm';
    // Gemini API throws 404 if the mime type is unsupported for generateContent (like m4a)
    if (mimeType.includes('m4a') || mimeType.includes('x-m4a')) {
      mimeType = 'audio/mp4'; // Map to a supported container format
    } else if (mimeType === 'application/octet-stream') {
      mimeType = 'audio/mp3'; // Fallback guess
    }"""
api_code = api_code.replace(old_mime, new_mime)

with open('src/app/api/meetings/transcribe/route.ts', 'w') as f:
    f.write(api_code)

print("Ultimate fix applied!")
