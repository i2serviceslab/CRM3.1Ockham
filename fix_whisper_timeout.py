import re

with open('src/app/api/meetings/transcribe/route.ts', 'r') as f:
    code = f.read()

old_logic = """    try {
      execSync(`ffmpeg -y -i "${tempInput}" -ar 16000 -ac 1 -b:a 16k "${tempOutput}"`, { stdio: 'pipe' });
    } catch (e: any) {
      if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
      if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
      const stderr = e.stderr ? e.stderr.toString() : e.message;
      throw new Error(`FFmpeg Error (Recibidos ${receivedMegabytes} MB): ` + stderr.slice(-300));
    }
    
    const mp3Buffer = fs.readFileSync(tempOutput);
    const blob = new Blob([mp3Buffer], { type: 'audio/mp3' });
    
    // Clean up temp files
    if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
    if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);

    const formData = new FormData();
    formData.append('file', blob, 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'text');
    formData.append('language', 'es'); // Force Spanish or allow auto

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAIKey}` },
      body: formData,
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      console.error("Whisper API Error:", errText);
      throw new Error(`OpenAI Whisper Error: ${whisperRes.status} - ${errText}`);
    }

    const transcriptText = await whisperRes.text();"""

new_logic = """    const segmentDir = path.join(os.tmpdir(), `segments_${Date.now()}`);
    fs.mkdirSync(segmentDir, { recursive: true });

    try {
      // 1. Convert to a single highly compressed MP3
      execSync(`ffmpeg -y -i "${tempInput}" -ar 16000 -ac 1 -b:a 16k "${tempOutput}"`, { stdio: 'pipe' });
      // 2. Split into 15-minute chunks (900 seconds) to prevent OpenAI Whisper Timeouts
      execSync(`ffmpeg -i "${tempOutput}" -f segment -segment_time 900 -c copy "${path.join(segmentDir, 'chunk_%03d.mp3')}"`, { stdio: 'pipe' });
    } catch (e: any) {
      if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
      if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
      const stderr = e.stderr ? e.stderr.toString() : e.message;
      throw new Error(`FFmpeg Error (Recibidos ${receivedMegabytes} MB): ` + stderr.slice(-300));
    }
    
    // Clean up original temp files
    if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
    if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);

    // Read all generated chunk files
    const chunks = fs.readdirSync(segmentDir).filter((f: string) => f.endsWith('.mp3')).sort();
    let transcriptText = "";

    // Process each chunk sequentially
    for (const chunkFile of chunks) {
      const chunkPath = path.join(segmentDir, chunkFile);
      const mp3Buffer = fs.readFileSync(chunkPath);
      const blob = new Blob([mp3Buffer], { type: 'audio/mp3' });
      
      const formData = new FormData();
      formData.append('file', blob, chunkFile);
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'text');
      formData.append('language', 'es'); 

      try {
        const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${openAIKey}` },
          body: formData,
        });

        if (!whisperRes.ok) {
          const errText = await whisperRes.text();
          throw new Error(`OpenAI Whisper Error: ${whisperRes.status} - ${errText}`);
        }

        const text = await whisperRes.text();
        transcriptText += text + " ";
      } finally {
        fs.unlinkSync(chunkPath); // clean up segment after uploading
      }
    }
    
    if (fs.existsSync(segmentDir)) fs.rmdirSync(segmentDir); // clean dir"""

code = code.replace(old_logic, new_logic)

with open('src/app/api/meetings/transcribe/route.ts', 'w') as f:
    f.write(code)

print("Whisper timeout fix applied!")
