import re

with open('src/components/meetings/MeetingRecorder.tsx', 'r') as f:
    code = f.read()

# Add audioFile state
code = code.replace("const [audioUrl, setAudioUrl] = useState<string | null>(null);", 
                    "const [audioUrl, setAudioUrl] = useState<string | null>(null);\n  const [audioFile, setAudioFile] = useState<File | Blob | null>(null);")

# Update file upload
old_upload = """  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAudioUrl(reader.result as string);
        setMeetingData(null);
        setSuccessMsg(null);
        setErrorMsg(null);
        setRecordingTime(0); // Will show 00:00 for uploaded files
      };
      reader.readAsDataURL(file);
    }
  };"""
new_upload = """  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setMeetingData(null);
      setSuccessMsg(null);
      setErrorMsg(null);
      setRecordingTime(0);
    }
  };"""
code = code.replace(old_upload, new_upload)

# Update stop recording
old_stop = """      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioUrl(reader.result as string);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((track) => track.stop());
      };"""
new_stop = """      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioFile(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };"""
code = code.replace(old_stop, new_stop)

# Update process meeting
old_process = """      const res = await fetch('/api/meetings/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioDataUrl: audioUrl, durationSeconds: recordingTime }),
      });"""
new_process = """      const formData = new FormData();
      formData.append('audio', audioFile as Blob);
      formData.append('durationSeconds', recordingTime.toString());

      const res = await fetch('/api/meetings/transcribe', {
        method: 'POST',
        body: formData,
      });"""
code = code.replace(old_process, new_process)

with open('src/components/meetings/MeetingRecorder.tsx', 'w') as f:
    f.write(code)


with open('src/app/api/meetings/transcribe/route.ts', 'r') as f:
    api_code = f.read()

old_api = """export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { audioDataUrl, durationSeconds, tenantId } = body;

    if (!audioDataUrl) {
      return NextResponse.json({ success: false, error: 'Audio data is required' }, { status: 400 });
    }

    if (!genAI) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY is missing' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
    const mimeType = audioDataUrl.substring(5, audioDataUrl.indexOf(';'));
    const audioPart = base64ToGenerativePart(audioDataUrl, mimeType);"""
new_api = """// Aumentamos el límite de tamaño de la ruta para Next.js (necesario para audios grandes)
export const maxDuration = 300; // 5 minutos de timeout
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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
    const mimeType = audioFile.type || 'audio/webm';
    
    const audioPart = {
      inlineData: {
        data: base64Data,
        mimeType
      }
    };"""
api_code = api_code.replace(old_api, new_api)

with open('src/app/api/meetings/transcribe/route.ts', 'w') as f:
    f.write(api_code)

print("Switched to FormData payload!")
