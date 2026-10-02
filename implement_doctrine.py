import re

with open('src/app/api/hermes/chat/route.ts', 'r') as f:
    code = f.read()

# 1. ADD NEW TOOL DECLARATION
old_tool = """            name: "extract_youtube_transcript","""
new_tool = """            name: "save_ai_knowledge",
            description: "Guarda una regla, instrucción, o doctrina de comunicación en el Drive (carpeta Doctrina) para recordarlo permanentemente en el futuro. Úsalo cuando el usuario te pida que aprendas o guardes un parámetro.",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING, description: "Título del documento o regla (ej. 'Tono de marca', 'Estructura de Posts')." },
                textContent: { type: SchemaType.STRING, description: "El contenido completo de la regla, doctrina o conocimiento que debes aprender y guardar." }
              },
              required: ["title", "textContent"]
            }
          },
          {
            name: "extract_youtube_transcript","""
code = code.replace(old_tool, new_tool)

# 2. UPDATE SYSTEM INSTRUCTION
old_sys = """Si el usuario te pide analizar un video de YouTube o sacar clips/cortes, usa la herramienta 'extract_youtube_transcript' para leer el contenido del video.
      Responde de forma ejecutiva, corporativa y estratégica.` }]"""

new_sys = """Si el usuario te pide analizar un video de YouTube o sacar clips/cortes, usa la herramienta 'extract_youtube_transcript' para leer el contenido del video.
      Si el usuario te pide guardar o aprender un parámetro de comunicación, usa 'save_ai_knowledge'. 
      Para leer doctrinas, usa 'query_crm_memory' buscando en la entidad 'files'.
      Responde de forma ejecutiva, corporativa y estratégica.` }]"""
code = code.replace(old_sys, new_sys)

# 3. IMPLEMENT SAVE_AI_KNOWLEDGE HANDLER
handler_spot = """} else if (call.name === "extract_youtube_transcript") {"""
new_handler = """} else if (call.name === "save_ai_knowledge") {
        const { title, textContent } = call.args as any;
        await prisma.hermesMessage.update({ where: { id: processingMsgId }, data: { content: `🧠 [Plugin: Doctrina] Guardando aprendizaje: "${title}"...` } });
        
        let resultMsg = "";
        try {
          // Buscar o crear la carpeta Doctrina
          let folder = await prisma.mediaFolder.findFirst({ where: { name: 'Doctrina Forge', tenantId: tenantId || null } });
          if (!folder) {
            folder = await prisma.mediaFolder.create({
              data: { name: 'Doctrina Forge', description: 'Base de conocimiento de la IA', color: '#FF002C', isSystem: true, tenantId: tenantId || null }
            });
          }
          
          await prisma.mediaFile.create({
            data: {
              tenantId: tenantId || null,
              folderId: folder.id,
              name: `${title}.txt`,
              mimeType: 'text/plain',
              sizeBytes: textContent.length,
              url: 'local://ai-doctrine',
              textContent: textContent
            }
          });
          resultMsg = `Conocimiento guardado exitosamente en la carpeta 'Doctrina Forge'.`;
        } catch (err: any) {
          resultMsg = `Error al guardar doctrina: ${err.message}`;
        }
        result = await chat.sendMessage(`Resultado (save_ai_knowledge): ${resultMsg}`);
        
      } else if (call.name === "extract_youtube_transcript") {"""
code = code.replace(handler_spot, new_handler)

# 4. ENHANCE QUERY_CRM_MEMORY FOR FILES
old_files = """            } else if (entity === 'files') {
                const files = await prisma.mediaFile.findMany({
                    where: { name: { contains: query, mode: 'insensitive' } }, take: 10
                });
                resultsText = files.length ? JSON.stringify(files) : "No hay archivos.";"""

new_files = """            } else if (entity === 'files') {
                const files = await prisma.mediaFile.findMany({
                    where: { OR: [ { name: { contains: query, mode: 'insensitive' } }, { textContent: { contains: query, mode: 'insensitive' } } ] }, take: 10
                });
                resultsText = files.length ? JSON.stringify(files.map(f => ({ nombre: f.name, contenido: f.textContent || 'Archivo multimedia (sin texto)' }))) : "No hay archivos o doctrinas.";"""
code = code.replace(old_files, new_files)

with open('src/app/api/hermes/chat/route.ts', 'w') as f:
    f.write(code)

print("Doctrine implementation done!")
