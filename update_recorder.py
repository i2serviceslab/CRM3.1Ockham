import re

with open('src/components/meetings/MeetingRecorder.tsx', 'r') as f:
    code = f.read()

# 1. Move UI elements up so they are ALWAYS visible
old_meta = """      {/* Meta Inputs */}
      {audioFile && (
        <div className="space-y-4 max-w-lg mx-auto mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Nombre de la Reunión</label>
            <input"""

new_meta = """      {/* Meta Inputs - Always visible so user can fill them before recording */}
      <div className="space-y-4 max-w-lg mx-auto mt-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Nombre de la Reunión (Opcional)</label>
          <input"""

code = code.replace(old_meta, new_meta)

old_meta_close = """          </div>
        </div>
      )}

      {/* Submit */}"""

new_meta_close = """          </div>
      </div>

      {/* Submit */}"""

code = code.replace(old_meta_close, new_meta_close)

# 2. Add Export PDF button & printable wrapper
old_results_start = """        {/* Results Display */}
        {result && (
          <div className="mt-8 space-y-6">
            <div className="bg-[#1E293B] border border-gray-700 p-6 rounded-lg">"""

new_results_start = """        {/* Results Display */}
        {result && (
          <div className="mt-8">
            <div className="flex justify-end mb-4">
               <button onClick={() => window.print()} className="bg-[#FF002C] hover:bg-red-700 text-white font-semibold py-2 px-4 rounded flex items-center gap-2">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path></svg>
                 Exportar a PDF
               </button>
            </div>
            <div id="printable-meeting-result" className="space-y-6">
              <div className="bg-[#1E293B] border border-gray-700 p-6 rounded-lg">"""

code = code.replace(old_results_start, new_results_start)

# close the wrapper properly
old_results_end = """              </div>
            </div>
          </div>
        )}"""

new_results_end = """              </div>
            </div>
            </div>
          </div>
        )}"""
code = code.replace(old_results_end, new_results_end)

with open('src/components/meetings/MeetingRecorder.tsx', 'w') as f:
    f.write(code)

print("Recorder updated with always-visible inputs and PDF export!")
