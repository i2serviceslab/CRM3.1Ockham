import re

with open('src/app/api/meetings/transcribe/route.ts', 'r') as f:
    api_code = f.read()

old_logic = """    const blob = new Blob([buffer], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, `audio${ext}`);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'text');
    formData.append('language', 'es'); // Force Spanish or allow auto"""

new_logic = """    // TRANCODE AND COMPRESS USING FFMPEG
    // This normalizes ALL obscure formats (AMR, OPUS, WMA, broken M4A) into a clean MP3
    // It also compresses it to 16kbps so 2.5 hours easily fits under Whisper's 25MB limit.
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const { execSync } = require('child_process');

    const tempInput = path.join(os.tmpdir(), `input_${Date.now()}`);
    const tempOutput = path.join(os.tmpdir(), `output_${Date.now()}.mp3`);
    
    fs.writeFileSync(tempInput, buffer);
    try {
      // Force 16000Hz, 1 channel (mono), 16kbps audio bitrate
      execSync(`ffmpeg -y -i "${tempInput}" -ar 16000 -ac 1 -b:a 16k "${tempOutput}"`, { stdio: 'ignore' });
    } catch (e) {
      if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
      if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
      throw new Error("FFmpeg failed to decode the audio file. It might be severely corrupted.");
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
    formData.append('language', 'es'); // Force Spanish or allow auto"""

api_code = api_code.replace(old_logic, new_logic)

with open('src/app/api/meetings/transcribe/route.ts', 'w') as f:
    f.write(api_code)

print("FFmpeg routing applied!")
