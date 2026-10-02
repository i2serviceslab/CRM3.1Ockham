import re

with open('src/app/api/meetings/transcribe/route.ts', 'r') as f:
    code = f.read()

old_logic = """    const durationSeconds = request.headers.get('X-Duration-Seconds') || '0';
    const tenantId = request.headers.get('X-Tenant-Id') || null;
    let mimeType = request.headers.get('Content-Type') || 'audio/webm';
    
    // Fallback file extension logic
    let ext = '.webm';
    if (mimeType.includes('mp4') || mimeType.includes('m4a') || mimeType.includes('x-m4a')) ext = '.m4a';
    else if (mimeType.includes('mp3')) ext = '.mp3';
    else if (mimeType.includes('wav')) ext = '.wav';
    else if (mimeType.includes('ogg')) ext = '.ogg';

    const arrayBuffer = await request.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return NextResponse.json({ success: false, error: 'Audio payload is empty' }, { status: 400 });
    }
    const buffer = Buffer.from(arrayBuffer);
    
    // DEBUG FILE SIZE
    const receivedMegabytes = (buffer.byteLength / (1024 * 1024)).toFixed(2);"""

new_logic = """    const durationSeconds = request.headers.get('X-Duration-Seconds') || '0';
    const tenantId = request.headers.get('X-Tenant-Id') || null;
    
    const bodyText = await request.text();
    const body = JSON.parse(bodyText);
    const finalPath = body.finalPath;
    let mimeType = body.mimeType || 'audio/webm';
    
    // Fallback file extension logic
    let ext = '.webm';
    if (mimeType.includes('mp4') || mimeType.includes('m4a') || mimeType.includes('x-m4a')) ext = '.m4a';
    else if (mimeType.includes('mp3')) ext = '.mp3';
    else if (mimeType.includes('wav')) ext = '.wav';
    else if (mimeType.includes('ogg')) ext = '.ogg';

    if (!finalPath) {
      return NextResponse.json({ success: false, error: 'Missing assembled file path' }, { status: 400 });
    }
    const fs = require('fs');
    if (!fs.existsSync(finalPath)) {
      return NextResponse.json({ success: false, error: 'Assembled file not found' }, { status: 400 });
    }
    const buffer = fs.readFileSync(finalPath);
    const receivedMegabytes = (buffer.byteLength / (1024 * 1024)).toFixed(2);"""

code = code.replace(old_logic, new_logic)

with open('src/app/api/meetings/transcribe/route.ts', 'w') as f:
    f.write(code)

print("Transcribe updated")
