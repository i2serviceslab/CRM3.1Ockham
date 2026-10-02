import re

with open('src/app/api/meetings/transcribe/route.ts', 'r') as f:
    api_code = f.read()

old_logic = "const tempFilePath = path.join(os.tmpdir(), `meeting_${Date.now()}.webm`);"
new_logic = """      let ext = '.webm';
      if (mimeType.includes('mp4') || mimeType.includes('m4a')) ext = '.mp4';
      else if (mimeType.includes('mp3')) ext = '.mp3';
      else if (mimeType.includes('wav')) ext = '.wav';
      else if (mimeType.includes('ogg')) ext = '.ogg';
      
      const tempFilePath = path.join(os.tmpdir(), `meeting_${Date.now()}${ext}`);"""

api_code = api_code.replace(old_logic, new_logic)

with open('src/app/api/meetings/transcribe/route.ts', 'w') as f:
    f.write(api_code)

print("Extension Fix Applied!")
