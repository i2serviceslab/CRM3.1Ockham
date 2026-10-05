import re

with open('src/components/meetings/MeetingRecorder.tsx', 'r') as f:
    tsx = f.read()

# 1. We need to move `#print-document` OUTSIDE of the grid container.
# Currently the grid ends at the end of the file.
# The layout is:
# return (
#   <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
#       <div className="xl:col-span-2 space-y-6">...</div>
#       <div className="space-y-6 print:hidden">...</div>
#       {/* DEDICATED PRINT LAYOUT */}
#       {meetingData && <div id="print-document">...</div>}
#   </div>
# );

# Let's extract the `#print-document` block completely, and put it after the grid container.
# Wait, I can just replace the whole return statement because I know exactly what it contains.
# Actually, I'll just use regex to move it. Or better, just string replace.

target_return = """  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">"""

new_return = """  return (
    <>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 print:hidden">"""

tsx = tsx.replace(target_return, new_return)

target_print_start = """      {/* DEDICATED PRINT LAYOUT */}
      {meetingData && (
        <div id="print-document" className="hidden print:block bg-white text-black font-sans w-full max-w-4xl mx-auto p-8">"""

new_print_start = """    </div>

    {/* DEDICATED PRINT LAYOUT */}
    {meetingData && (
      <div id="print-document" className="hidden print:block bg-white text-black font-sans w-full max-w-4xl mx-auto">"""

tsx = tsx.replace(target_print_start, new_print_start)

# Add logo and better footer
target_header = """          <div className="border-b-4 border-black pb-4 mb-8">
            <h1 className="text-4xl font-black text-black uppercase tracking-widest">Acta de Reunión</h1>
            <p className="text-gray-500 mt-2 font-mono text-sm tracking-widest">{new Date().toLocaleDateString()} | REPORTE GENERADO POR IA</p>
          </div>"""

new_header = """          <div className="border-b-4 border-black pb-6 mb-8 flex items-end justify-between">
            <div>
              <h1 className="text-4xl font-black text-black uppercase tracking-widest">Acta de Reunión</h1>
              <p className="text-gray-500 mt-2 font-mono text-sm tracking-widest">{new Date().toLocaleDateString()} | REPORTE GENERADO POR IA</p>
            </div>
            <img src="/logo.svg" alt="Copper Giant" className="h-10 print:invert" />
          </div>"""

tsx = tsx.replace(target_header, new_header)

target_footer = """          <div className="mt-16 pt-8 border-t border-gray-300 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Generado automáticamente por Meeting Intelligence CRM</p>
          </div>
        </div>
      )}
    </div>
  );"""

new_footer = """          <div className="mt-16 pt-8 border-t border-gray-300 flex justify-between items-center">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Meeting Intelligence beta v1.2</p>
            <p className="text-xs text-gray-400 font-mono">Confidential & Proprietary</p>
          </div>
        </div>
      )}
    </>
  );"""

tsx = tsx.replace(target_footer, new_footer)

with open('src/components/meetings/MeetingRecorder.tsx', 'w') as f:
    f.write(tsx)

print("TSX Layout updated!")
