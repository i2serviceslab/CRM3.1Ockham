import re

with open('src/components/meetings/MeetingRecorder.tsx', 'r') as f:
    code = f.read()

old_fetch = """      const res = await fetch('/api/meetings/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': (audioFile as File).type || 'audio/webm',
          'X-Duration-Seconds': recordingTime.toString(),
        },
        body: audioFile,
      });

      const data = await res.json();"""

new_fetch = """      let finalPath = '';
      if (audioFile) {
        const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB
        const totalChunks = Math.ceil(audioFile.size / CHUNK_SIZE);
        const fileId = Date.now().toString();

        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(audioFile.size, start + CHUNK_SIZE);
          const chunk = audioFile.slice(start, end);

          const formData = new FormData();
          formData.append('chunk', chunk);
          formData.append('fileId', fileId);
          formData.append('chunkIndex', i.toString());
          formData.append('totalChunks', totalChunks.toString());

          const uploadRes = await fetch('/api/meetings/upload-chunk', { method: 'POST', body: formData });
          const uploadData = await uploadRes.json();
          if (!uploadData.success) throw new Error("Upload falló en el pedazo " + i);
          if (uploadData.finalPath) finalPath = uploadData.finalPath;
        }
      }

      // 2. Transcribe using the assembled file path
      const res = await fetch('/api/meetings/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Duration-Seconds': recordingTime.toString(),
        },
        body: JSON.stringify({ finalPath, mimeType: (audioFile as File).type || 'audio/webm' }),
      });

      const data = await res.json();"""

code = code.replace(old_fetch, new_fetch)

with open('src/components/meetings/MeetingRecorder.tsx', 'w') as f:
    f.write(code)

print("Recorder updated")
