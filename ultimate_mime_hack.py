import re

with open('src/app/api/meetings/transcribe/route.ts', 'r') as f:
    api_code = f.read()

# Replace MIME type handling to spoof video
old_mime = """let mimeType = request.headers.get('Content-Type') || 'audio/webm';
    // Gemini API throws 404 if the mime type is unsupported for generateContent (like m4a)
    if (mimeType.includes('m4a') || mimeType.includes('x-m4a')) {
      mimeType = 'audio/mp4'; // Map to a supported container format
    } else if (mimeType === 'application/octet-stream') {
      mimeType = 'audio/mp3'; // Fallback guess
    }"""

new_mime = """let originalMime = request.headers.get('Content-Type') || 'audio/webm';
    // EL TRUCO DEFINITIVO: Google rechaza audio/webm y audio/m4a con un error 404.
    // PERO soporta nativamente video/webm y video/mp4. 
    // Al disfrazar CUALQUIER audio no soportado como un video, forzamos al API Gateway
    // de Google a dejarlo pasar, y su decodificador interno extraerá el audio.
    let mimeType = 'audio/mp3'; // Default seguro
    if (originalMime.includes('webm')) {
      mimeType = 'video/webm'; 
    } else if (originalMime.includes('mp4') || originalMime.includes('m4a')) {
      mimeType = 'video/mp4';
    } else if (originalMime.includes('ogg')) {
      mimeType = 'audio/ogg';
    } else if (originalMime.includes('wav')) {
      mimeType = 'audio/wav';
    } else {
      mimeType = 'video/mp4'; // Ante la duda, disfrazarlo de video mp4
    }"""

api_code = api_code.replace(old_mime, new_mime)

with open('src/app/api/meetings/transcribe/route.ts', 'w') as f:
    f.write(api_code)

print("MIME Hack applied!")
