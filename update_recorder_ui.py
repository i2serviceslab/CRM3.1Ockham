import re

with open('src/components/meetings/MeetingRecorder.tsx', 'r') as f:
    code = f.read()

# Add imports for React hooks
code = code.replace("import React, { useState, useRef } from 'react';", "import React, { useState, useRef, useEffect } from 'react';")

# Add History State
history_state = """  const [meetingData, setMeetingData] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);"""
code = code.replace("  const [meetingData, setMeetingData] = useState<any | null>(null);", history_state)

# Add fetchHistory function
fetch_history = """  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/meetings/history');
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleProcessMeeting = async () => {"""
code = code.replace("  const handleProcessMeeting = async () => {", fetch_history)

# Add fetchHistory call after successful processing
refresh_call = """        setMeetingData(data.result);
        setSuccessMsg(`Meeting successfully analyzed! Extracted ${data.result.actionItems?.length || 0} action items and ${data.result.aiDoctrines?.length || 0} doctrines.`);
        fetchHistory();"""
code = code.replace("""        setMeetingData(data.result);
        setSuccessMsg(`Meeting successfully analyzed! Extracted ${data.result.actionItems?.length || 0} action items and ${data.result.aiDoctrines?.length || 0} doctrines.`);""", refresh_call)


# Replace layout with a Grid to show History on the right
old_return = """  return (
    <div className="space-y-6">"""

new_return = """  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">"""
code = code.replace(old_return, new_return)

# Close the left column and add the right column
old_end = """      )}
    </div>
  );"""

new_end = """      )}
      </div>

      <div className="space-y-6">
        <div className="p-5 rounded-sm bg-slate-900 border border-white/10 h-full max-h-[800px] overflow-y-auto custom-scrollbar">
          <h3 className="text-lg font-black text-white flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-blue-400" /> Historial de Actas
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            Historial permanente de las reuniones procesadas. El audio pesado no se almacena en el servidor para ahorrar espacio, pero el acta, el resumen y las tareas se guardan para siempre.
          </p>

          <div className="space-y-3">
            {history.map((file, i) => {
              let parsed: any = {};
              try { parsed = JSON.parse(file.aiSummary || '{}'); } catch(e) {}
              
              return (
                <div key={i} className="p-4 bg-[#0f1218] border border-white/5 rounded-sm hover:border-white/20 transition-all cursor-pointer" onClick={() => setMeetingData(parsed)}>
                  <div className="flex justify-between items-start mb-2">
                    <strong className="text-sm text-slate-200">{file.name.replace('.json', '')}</strong>
                    <span className="text-[10px] text-slate-500">{new Date(file.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {parsed.summary || 'Acta de reunión procesada.'}
                  </p>
                </div>
              );
            })}
            
            {history.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-10">No hay reuniones grabadas aún.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );"""
code = code.replace(old_end, new_end)

with open('src/components/meetings/MeetingRecorder.tsx', 'w') as f:
    f.write(code)

print("UI Updated!")
