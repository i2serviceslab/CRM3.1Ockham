import re

with open('src/components/meetings/MeetingRecorder.tsx', 'r') as f:
    code = f.read()

# Update process meeting in Frontend to send binary payload
old_process = """      const formData = new FormData();
      formData.append('audio', audioFile as Blob);
      formData.append('durationSeconds', recordingTime.toString());

      const res = await fetch('/api/meetings/transcribe', {
        method: 'POST',
        body: formData,
      });"""
new_process = """      // Send raw binary instead of FormData to bypass strict multipart parsers
      const res = await fetch('/api/meetings/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': (audioFile as File).type || 'audio/webm',
          'X-Duration-Seconds': recordingTime.toString(),
        },
        body: audioFile,
      });"""
code = code.replace(old_process, new_process)

with open('src/components/meetings/MeetingRecorder.tsx', 'w') as f:
    f.write(code)


with open('src/app/api/meetings/transcribe/route.ts', 'r') as f:
    api_code = f.read()

# Update backend to read arrayBuffer
old_api = """export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as Blob;
    const durationSeconds = formData.get('durationSeconds') as string;
    const tenantId = formData.get('tenantId') as string | null;

    if (!audioFile) {
      return NextResponse.json({ success: false, error: 'Audio data is required' }, { status: 400 });
    }

    if (!genAI) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY is missing' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
    
    // Convert Blob to Base64 for Gemini
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    const mimeType = audioFile.type || 'audio/webm';"""

new_api = """export async function POST(request: Request) {
  try {
    const mimeType = request.headers.get('Content-Type') || 'audio/webm';
    const durationSeconds = request.headers.get('X-Duration-Seconds') || '0';
    const tenantId = request.headers.get('X-Tenant-Id') || null;

    const arrayBuffer = await request.arrayBuffer();
    
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return NextResponse.json({ success: false, error: 'Audio payload is empty or too large.' }, { status: 400 });
    }

    if (!genAI) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY is missing' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
    
    // Convert ArrayBuffer to Base64 for Gemini
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');"""
api_code = api_code.replace(old_api, new_api)

with open('src/app/api/meetings/transcribe/route.ts', 'w') as f:
    f.write(api_code)

print("Switched to raw binary payload!")
