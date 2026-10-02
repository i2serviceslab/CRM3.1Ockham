import re

with open('src/app/api/meetings/transcribe/route.ts', 'r') as f:
    code = f.read()

# Update variable extraction
old_extract = """    const finalPath = body.finalPath;
    let mimeType = body.mimeType || 'audio/webm';"""

new_extract = """    const finalPath = body.finalPath;
    let mimeType = body.mimeType || 'audio/webm';
    const meetingName = body.meetingName?.trim() || `Reunión_${new Date().toISOString().split('T')[0]}_${Math.floor(Math.random() * 1000)}`;
    const extraContext = body.extraContext?.trim() || '';"""

code = code.replace(old_extract, new_extract)

# Update GPT Prompt
old_prompt = """        messages: [
          { role: 'system', content: 'Actúa como un secretario corporativo avanzado. Lee esta transcripción de una reunión grupal. Identifica a los diferentes interlocutores si es posible. Devuelve estrictamente un JSON con esta estructura exacta: { "transcript": "...", "summary": "Resumen ejecutivo de 3 líneas", "actionItems": ["Tarea 1"], "aiDoctrines": [ { "title": "Regla", "rule": "Descripción" } ] }' },
          { role: 'user', content: `Transcripción:\\n${transcriptText.slice(0, 300000)}` } // Safely cap at 300k chars just in case
        ],"""

new_prompt = """        messages: [
          { role: 'system', content: `Actúa como un secretario corporativo avanzado. Lee esta transcripción de una reunión grupal. Identifica a los diferentes interlocutores si es posible.\\n${extraContext ? `CONTEXTO ADICIONAL DEL USUARIO: "${extraContext}"\\nPresta especial atención a este contexto al extraer tareas y generar el resumen.\\n` : ''}Devuelve estrictamente un JSON con esta estructura exacta: { "transcript": "...", "summary": "Resumen ejecutivo de 3 líneas", "actionItems": ["Tarea 1"], "aiDoctrines": [ { "title": "Regla", "rule": "Descripción" } ] }` },
          { role: 'user', content: `Transcripción:\\n${transcriptText.slice(0, 300000)}` }
        ],"""

code = code.replace(old_prompt, new_prompt)

# Update Title usage
old_title = """    const meetingTitle = `Reunión_${new Date().toISOString().split('T')[0]}_${Math.floor(Math.random() * 1000)}`;

    await prisma.mediaFile.create({
      data: {
        tenantId: tenantId || null,
        folderId: minutesFolder.id,
        name: `${meetingTitle}.json`,"""

new_title = """    await prisma.mediaFile.create({
      data: {
        tenantId: tenantId || null,
        folderId: minutesFolder.id,
        name: `${meetingName}.json`,"""

code = code.replace(old_title, new_title)

with open('src/app/api/meetings/transcribe/route.ts', 'w') as f:
    f.write(code)

print("Backend Route Updated!")
