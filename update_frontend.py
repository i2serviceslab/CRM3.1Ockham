import re

with open('src/components/meetings/MeetingRecorder.tsx', 'r') as f:
    code = f.read()

# Add states
old_states = """  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);"""

new_states = """  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [meetingName, setMeetingName] = useState('');
  const [extraContext, setExtraContext] = useState('');"""

code = code.replace(old_states, new_states)

# Add to fetch payload
old_body = """        body: JSON.stringify({ finalPath, mimeType: (audioFile as File).type || 'audio/webm' }),"""

new_body = """        body: JSON.stringify({ finalPath, mimeType: (audioFile as File).type || 'audio/webm', meetingName, extraContext }),"""

code = code.replace(old_body, new_body)

# Add UI Elements
old_ui = """      {/* Player (if audio recorded/uploaded) */}
      {audioUrl && (
        <div className="bg-[#1E293B] rounded-full p-2 flex items-center justify-center max-w-lg mx-auto">
          <audio src={audioUrl} controls className="w-full h-10 outline-none" />
        </div>
      )}

      {/* Submit */}
      {audioFile && (
        <div className="flex justify-center mt-6">"""

new_ui = """      {/* Player (if audio recorded/uploaded) */}
      {audioUrl && (
        <div className="bg-[#1E293B] rounded-full p-2 flex items-center justify-center max-w-lg mx-auto">
          <audio src={audioUrl} controls className="w-full h-10 outline-none" />
        </div>
      )}

      {/* Meta Inputs */}
      {audioFile && (
        <div className="space-y-4 max-w-lg mx-auto mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Nombre de la Reunión</label>
            <input
              type="text"
              placeholder="Ej. Junta Directiva Q3"
              className="w-full bg-[#0F172A] border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              value={meetingName}
              onChange={(e) => setMeetingName(e.target.value)}
              disabled={processing}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Contexto Adicional (Opcional)</label>
            <textarea
              placeholder="Ej. Presta especial atención a la propuesta de Sebastián sobre los videos..."
              className="w-full bg-[#0F172A] border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500 h-20 resize-none"
              value={extraContext}
              onChange={(e) => setExtraContext(e.target.value)}
              disabled={processing}
            />
          </div>
        </div>
      )}

      {/* Submit */}
      {audioFile && (
        <div className="flex justify-center mt-6">"""

code = code.replace(old_ui, new_ui)

with open('src/components/meetings/MeetingRecorder.tsx', 'w') as f:
    f.write(code)

print("Frontend Updated!")
