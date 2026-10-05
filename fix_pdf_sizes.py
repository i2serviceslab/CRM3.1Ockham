import re

with open('src/components/meetings/MeetingRecorder.tsx', 'r') as f:
    tsx = f.read()

# I will replace the DEDICATED PRINT LAYOUT block to have smaller text and tighter margins.
# Let's extract everything from `      {/* DEDICATED PRINT LAYOUT */}` to the end.

target = """      {/* DEDICATED PRINT LAYOUT */}
      {meetingData && (
        <div id="print-document" className="hidden print:block bg-white text-black font-sans w-full max-w-4xl mx-auto p-8">
          <div className="border-b-4 border-black pb-6 mb-8 flex items-end justify-between">
            <div>
              <h1 className="text-4xl font-black text-black uppercase tracking-widest">Acta de Reunión</h1>
              <p className="text-gray-500 mt-2 font-mono text-sm tracking-widest">{new Date().toLocaleDateString()} | REPORTE GENERADO POR IA</p>
            </div>
            <img src="/logo.svg" alt="Copper Giant" className="h-10 print:invert" />
          </div>

          <div className="mb-10">
            <h2 className="text-sm uppercase tracking-widest font-bold text-gray-500 border-b border-gray-300 pb-2 mb-4">Información de la Reunión</h2>
            <p className="text-xl font-bold text-black">{isEditing ? editTitle : meetingName || 'Reunión Sin Título'}</p>
          </div>

          <div className="mb-10">
            <h2 className="text-sm uppercase tracking-widest font-bold text-gray-500 border-b border-gray-300 pb-2 mb-4">Resumen Ejecutivo</h2>
            <p className="text-lg text-gray-800 leading-relaxed font-medium">{isEditing ? editSummary : meetingData.summary}</p>
          </div>

          {((isEditing ? editActionItems : meetingData.actionItems) || []).length > 0 && (
            <div className="mb-10">
              <h2 className="text-sm uppercase tracking-widest font-bold text-gray-500 border-b border-gray-300 pb-2 mb-4">Tareas Extraídas</h2>
              <ul className="space-y-3">
                {(isEditing ? editActionItems : meetingData.actionItems).map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-gray-800 text-lg">
                    <div className="w-5 h-5 border-2 border-black rounded-sm inline-block mt-1 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {((isEditing ? editDoctrines : meetingData.aiDoctrines) || []).length > 0 && (
            <div className="mb-10">
              <h2 className="text-sm uppercase tracking-widest font-bold text-gray-500 border-b border-gray-300 pb-2 mb-4">Doctrinas Aprendidas</h2>
              <ul className="list-disc pl-6 space-y-3 text-gray-800 text-lg">
                {(isEditing ? editDoctrines : meetingData.aiDoctrines).map((doc: any, i: number) => (
                  <li key={i}>
                    <strong className="text-black">{doc.title}:</strong> {doc.rule}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-10">
            <h2 className="text-sm uppercase tracking-widest font-bold text-gray-500 border-b border-gray-300 pb-2 mb-4">Transcripción Completa</h2>
            <div className="space-y-4">
               {((isEditing ? editTranscript : meetingData.transcript) || '').split('\\n').map((line: string, i: number) => {
                 if (!line.trim()) return null;
                 const isSpeaker = line.includes(':');
                 return (
                   <p key={i} className="text-sm text-gray-700 leading-relaxed transcript-line">
                     {isSpeaker ? (
                       <>
                         <strong className="text-black font-bold uppercase">{line.split(':')[0]}:</strong>
                         {line.substring(line.indexOf(':') + 1)}
                       </>
                     ) : (
                       line
                     )}
                   </p>
                 );
               })}
            </div>
          </div>
          
          <div className="mt-16 pt-8 border-t border-gray-300 flex justify-between items-center">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Meeting Intelligence beta v1.2</p>
            <p className="text-xs text-gray-400 font-mono">Confidential & Proprietary</p>
          </div>
        </div>
      )}
    </>
  );
};"""

# New tighter and smaller text
new_ts = """      {/* DEDICATED PRINT LAYOUT */}
      {meetingData && (
        <div id="print-document" className="hidden print:block bg-white text-black font-sans w-full mx-auto">
          <div className="border-b-2 border-black pb-4 mb-6 flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-black text-black uppercase tracking-widest">Acta de Reunión</h1>
              <p className="text-gray-500 mt-1 font-mono text-xs tracking-widest">{new Date().toLocaleDateString()} | REPORTE GENERADO POR IA</p>
            </div>
            <img src="/logo.svg" alt="Copper Giant" className="h-8 print:brightness-0" />
          </div>

          <div className="mb-6">
            <h2 className="text-xs uppercase tracking-widest font-bold text-gray-500 border-b border-gray-300 pb-1 mb-3">Información de la Reunión</h2>
            <p className="text-lg font-bold text-black">{isEditing ? editTitle : meetingName || 'Reunión Sin Título'}</p>
          </div>

          <div className="mb-6">
            <h2 className="text-xs uppercase tracking-widest font-bold text-gray-500 border-b border-gray-300 pb-1 mb-3">Resumen Ejecutivo</h2>
            <p className="text-[15px] text-gray-800 leading-relaxed">{isEditing ? editSummary : meetingData.summary}</p>
          </div>

          {((isEditing ? editActionItems : meetingData.actionItems) || []).length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs uppercase tracking-widest font-bold text-gray-500 border-b border-gray-300 pb-1 mb-3">Tareas Extraídas</h2>
              <ul className="space-y-2">
                {(isEditing ? editActionItems : meetingData.actionItems).map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-gray-800 text-[15px]">
                    <div className="w-4 h-4 border border-black rounded-[2px] inline-block mt-1 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {((isEditing ? editDoctrines : meetingData.aiDoctrines) || []).length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs uppercase tracking-widest font-bold text-gray-500 border-b border-gray-300 pb-1 mb-3">Doctrinas Aprendidas</h2>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-800 text-[15px]">
                {(isEditing ? editDoctrines : meetingData.aiDoctrines).map((doc: any, i: number) => (
                  <li key={i}>
                    <strong className="text-black">{doc.title}:</strong> {doc.rule}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-xs uppercase tracking-widest font-bold text-gray-500 border-b border-gray-300 pb-1 mb-3">Transcripción Completa</h2>
            <div className="space-y-2">
               {((isEditing ? editTranscript : meetingData.transcript) || '').split('\\n').map((line: string, i: number) => {
                 if (!line.trim()) return null;
                 const isSpeaker = line.includes(':');
                 return (
                   <p key={i} className="text-[12px] text-gray-700 leading-relaxed transcript-line">
                     {isSpeaker ? (
                       <>
                         <strong className="text-black font-bold uppercase">{line.split(':')[0]}:</strong>
                         {line.substring(line.indexOf(':') + 1)}
                       </>
                     ) : (
                       line
                     )}
                   </p>
                 );
               })}
            </div>
          </div>
          
          <div className="mt-10 pt-4 border-t border-gray-300 flex justify-between items-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Meeting Intelligence beta v1.2</p>
            <p className="text-[10px] text-gray-400 font-mono">Confidential & Proprietary</p>
          </div>
        </div>
      )}
    </>
  );
};"""

tsx = tsx.replace(target, new_ts)

with open('src/components/meetings/MeetingRecorder.tsx', 'w') as f:
    f.write(tsx)

print("TSX updated with smaller fonts")

with open('src/app/globals.css', 'r') as f:
    css = f.read()

target_css = """  #print-document {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    max-width: 21cm !important;
    margin: 0 auto !important;
    padding: 2cm !important;
    background-color: white !important;
    color: black !important;
    box-sizing: border-box !important;
  }"""

new_css = """  #print-document {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    max-width: 21cm !important;
    margin: 0 auto !important;
    padding: 2.54cm !important; /* Standard 1-inch margins */
    background-color: white !important;
    color: black !important;
    box-sizing: border-box !important;
  }
  
  /* Ensure p text breaks gracefully */
  #print-document p, #print-document li {
    line-height: 1.6 !important;
  }
  """

css = css.replace(target_css, new_css)

with open('src/app/globals.css', 'w') as f:
    f.write(css)

print("CSS updated with 2.54cm padding")
