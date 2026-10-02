import re

with open('src/app/api/meetings/transcribe/route.ts', 'r') as f:
    api_code = f.read()

old_logic = """    try {
      // Force 16000Hz, 1 channel (mono), 16kbps audio bitrate
      execSync(`ffmpeg -y -i "${tempInput}" -ar 16000 -ac 1 -b:a 16k "${tempOutput}"`, { stdio: 'ignore' });
    } catch (e) {
      if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
      if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
      throw new Error("FFmpeg failed to decode the audio file. It might be severely corrupted.");
    }"""

new_logic = """    try {
      execSync(`ffmpeg -y -i "${tempInput}" -ar 16000 -ac 1 -b:a 16k "${tempOutput}"`, { stdio: 'pipe' });
    } catch (e: any) {
      if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
      if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
      const stderr = e.stderr ? e.stderr.toString() : e.message;
      throw new Error("FFmpeg Error: " + stderr.slice(-300));
    }"""

api_code = api_code.replace(old_logic, new_logic)

with open('src/app/api/meetings/transcribe/route.ts', 'w') as f:
    f.write(api_code)

print("FFmpeg debug applied!")
