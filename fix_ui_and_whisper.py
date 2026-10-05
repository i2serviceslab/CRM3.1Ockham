import re

with open('src/components/meetings/MeetingRecorder.tsx', 'r') as f:
    code = f.read()

# Make the inputs permanently visible
target = """      {audioUrl && !meetingData && (
        <div className="space-y-4 max-w-lg mx-auto mt-6 w-full">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Nombre de la Reunión (Opcional)</label>"""

new = """      {/* Opciones Visibles Siempre */}
      <div className="space-y-4 max-w-lg mx-auto mt-6 w-full">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Nombre de la Reunión (Opcional)</label>"""

code = code.replace(target, new)

# Close the newly opened block correctly
# The old block had:
#           </div>
#         </div>
#       )}
# We need to remove the `)}`

target2 = """            />
          </div>
        </div>
      )}

      {audioUrl && !meetingData && ("""

new2 = """            />
          </div>
        </div>

      {audioUrl && !meetingData && ("""

code = code.replace(target2, new2)

with open('src/components/meetings/MeetingRecorder.tsx', 'w') as f:
    f.write(code)

with open('src/app/api/meetings/transcribe/route.ts', 'r') as f:
    route_code = f.read()

whisper_target = """      formData.append('model', 'whisper-1');
      formData.append('response_format', 'text');
      formData.append('language', 'es'); """

whisper_new = """      formData.append('model', 'whisper-1');
      formData.append('response_format', 'text');
      formData.append('language', 'es'); 
      formData.append('prompt', 'Esta es una transcripción profesional, directa y formal de una reunión de negocios en la vida real. Se han omitido estrictamente todas las muletillas, tartamudeos, risas, sonidos de duda y onomatopeyas (como ah, eh, um, mmm, este, osea). El texto debe ser fluido y limpio.');"""

route_code = route_code.replace(whisper_target, whisper_new)

with open('src/app/api/meetings/transcribe/route.ts', 'w') as f:
    f.write(route_code)

print("UI visibility fixed and Whisper prompt added!")
