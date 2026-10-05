import re

with open('src/app/globals.css', 'r') as f:
    css = f.read()

# Replace the old print block
target_print = """@media print {
  body * {
    visibility: hidden;
  }
  #printable-meeting-result, #printable-meeting-result * {
    visibility: visible;
  }
  #printable-meeting-result {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    margin: 0;
    padding: 0;
  }
  
  /* Force dark theme elements to look good on white paper */
  #printable-meeting-result * {
    color: black !important;
    background-color: transparent !important;
    border-color: #ccc !important;
    box-shadow: none !important;
  }
  
  /* Remove scrolling and max heights so the full text renders */
  #printable-meeting-result .overflow-y-auto,
  #printable-meeting-result .max-h-\\[400px\\] {
    overflow: visible !important;
    max-height: none !important;
  }
  
  /* Page break rules for paragraphs to avoid cutting text in half */
  #printable-meeting-result p, 
  #printable-meeting-result li {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Force grid into a block stack so columns don't squish */
  #printable-meeting-result.grid,
  #printable-meeting-result .grid {
    display: block !important;
  }
  
  #printable-meeting-result > div {
    margin-bottom: 2rem;
  }
}"""

new_print = """@media print {
  @page {
    margin: 1.5cm;
    size: auto;
  }
  
  body * {
    visibility: hidden;
  }
  
  #print-document, #print-document * {
    visibility: visible;
  }
  
  #print-document {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    margin: 0;
    padding: 0;
    background-color: white !important;
    color: black !important;
  }
  
  #print-document * {
    background-color: transparent !important;
    color: black !important;
    box-shadow: none !important;
  }

  h1, h2, h3, h4, h5 {
    page-break-after: avoid;
  }

  p, li, .transcript-line {
    page-break-inside: avoid;
    break-inside: avoid;
  }
}"""

css = css.replace(target_print, new_print)

with open('src/app/globals.css', 'w') as f:
    f.write(css)

print("globals.css updated for dedicated print layout!")

# Now update MeetingRecorder.tsx
with open('src/components/meetings/MeetingRecorder.tsx', 'r') as f:
    tsx = f.read()

# Remove the old id="printable-meeting-result"
tsx = tsx.replace('id="printable-meeting-result" className="grid', 'className="grid')

# Add handlePrint function
target_fn = "const saveEdits = async () => {"
new_fn = """const handlePrint = () => {
    const originalTitle = document.title;
    document.title = (isEditing ? editTitle : meetingName) || 'Acta_Reunion';
    window.print();
    document.title = originalTitle;
  };

  const saveEdits = async () => {"""
tsx = tsx.replace(target_fn, new_fn)

# Replace window.print() button
tsx = tsx.replace('onClick={() => window.print()}', 'onClick={handlePrint}')

# Inject the hidden print document at the very end of the component return
target_end = """        </div>
      </div>
    </div>
  );
};"""

new_end = """        </div>
      </div>

      {/* DEDICATED PRINT LAYOUT */}
      {meetingData && (
        <div id="print-document" className="hidden print:block bg-white text-black font-sans w-full max-w-4xl mx-auto p-8">
          <div className="border-b-4 border-black pb-4 mb-8">
            <h1 className="text-4xl font-black text-black uppercase tracking-widest">Acta de Reunión</h1>
            <p className="text-gray-500 mt-2 font-mono text-sm tracking-widest">{new Date().toLocaleDateString()} | REPORTE GENERADO POR IA</p>
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
          
          <div className="mt-16 pt-8 border-t border-gray-300 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Generado automáticamente por Meeting Intelligence CRM</p>
          </div>
        </div>
      </div>
    </div>
  );
};"""

tsx = tsx.replace(target_end, new_end)

with open('src/components/meetings/MeetingRecorder.tsx', 'w') as f:
    f.write(tsx)

print("MeetingRecorder.tsx updated!")
