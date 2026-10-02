import re

with open('src/components/meetings/MeetingRecorder.tsx', 'r') as f:
    code = f.read()

# 1. Inject inputs right before the process button block
target_block = """      {audioUrl && !meetingData && (
        <div className="flex flex-col items-center gap-4 mt-6">
          <audio controls src={audioUrl} className="w-full max-w-md" />"""

new_block = """      {audioUrl && !meetingData && (
        <div className="space-y-4 max-w-lg mx-auto mt-6 w-full">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Nombre de la Reunión (Opcional)</label>
            <input
              type="text"
              placeholder="Ej. Junta Directiva Q3"
              className="w-full bg-[#0f1218] border border-white/10 rounded-sm py-2 px-3 text-slate-200 focus:outline-none focus:border-red-500 text-sm"
              value={meetingName}
              onChange={(e) => setMeetingName(e.target.value)}
              disabled={processing}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Contexto Adicional (Opcional)</label>
            <textarea
              placeholder="Ej. Presta especial atención a la propuesta de Sebastián sobre los videos..."
              className="w-full bg-[#0f1218] border border-white/10 rounded-sm py-2 px-3 text-slate-200 focus:outline-none focus:border-red-500 h-20 resize-none text-sm"
              value={extraContext}
              onChange={(e) => setExtraContext(e.target.value)}
              disabled={processing}
            />
          </div>
        </div>
      )}

      {audioUrl && !meetingData && (
        <div className="flex flex-col items-center gap-4 mt-6">
          <audio controls src={audioUrl} className="w-full max-w-md" />"""

code = code.replace(target_block, new_block)

# 2. Inject PDF Export Button & wrapper
target_result = """      {meetingData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">"""

new_result = """      {meetingData && (
        <div className="mt-8">
          <div className="flex justify-end mb-4 print:hidden">
            <button onClick={() => window.print()} className="bg-[#FF002C] hover:bg-red-700 text-white font-bold py-2 px-4 rounded-sm text-xs flex items-center gap-2 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path></svg>
              Exportar a PDF
            </button>
          </div>
        <div id="printable-meeting-result" className="grid grid-cols-1 lg:grid-cols-2 gap-6">"""

code = code.replace(target_result, new_result)

# Close wrapper
target_end = """        </div>
      )}
      </div>

      <div className="space-y-6">"""

new_end = """        </div>
        </div>
      )}
      </div>

      <div className="space-y-6 print:hidden">"""

code = code.replace(target_end, new_end)

with open('src/components/meetings/MeetingRecorder.tsx', 'w') as f:
    f.write(code)

print("UI successfully injected!")
