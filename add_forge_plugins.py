import os

filepath = 'src/app/api/hermes/chat/route.ts'
with open(filepath, 'r') as f:
    code = f.read()

# 1. Add tool declarations
old_decl = """          {
            name: "query_crm_memory",
            description: "Busca información en la base de datos (Memoria) del CRM. Úsalo para buscar contactos, inversores, posteos de redes sociales anteriores o archivos del Drive.",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                entity: { type: SchemaType.STRING, description: "El tipo de información a buscar. Debe ser 'contacts' (contactos/inversores), 'social_posts' (publicaciones de redes/marketing), o 'files' (archivos/documentos)." },
                query: { type: SchemaType.STRING, description: "Palabra clave o término de búsqueda (ej. 'CEO', 'Cobre', 'Reporte', nombre de la persona)." }
              },
              required: ["entity", "query"]
            }
          }"""

new_decl = """          {
            name: "query_crm_memory",
            description: "Busca información en la base de datos (Memoria) del CRM. Úsalo para buscar contactos, inversores, posteos de redes sociales anteriores o archivos del Drive.",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                entity: { type: SchemaType.STRING, description: "El tipo de información a buscar. Debe ser 'contacts' (contactos/inversores), 'social_posts' (publicaciones de redes/marketing), o 'files' (archivos/documentos)." },
                query: { type: SchemaType.STRING, description: "Palabra clave o término de búsqueda (ej. 'CEO', 'Cobre', 'Reporte', nombre de la persona)." }
              },
              required: ["entity", "query"]
            }
          },
          {
            name: "draft_social_post",
            description: "Redacta y guarda un borrador de publicación en el Social Calendar del CRM para que el Community Manager lo apruebe.",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING, description: "Título interno o idea principal del post." },
                content: { type: SchemaType.STRING, description: "El contenido final redactado del post (incluyendo hashtags y emojis)." },
                platforms: { type: SchemaType.STRING, description: "Plataformas sugeridas (ej. 'linkedin,twitter,instagram')." },
                scheduledDate: { type: SchemaType.STRING, description: "Fecha y hora sugerida en formato ISO (ej. '2026-10-15T14:00:00Z')." }
              },
              required: ["title", "content", "platforms", "scheduledDate"]
            }
          },
          {
            name: "extract_youtube_transcript",
            description: "Extrae los subtítulos/transcripción de un video de YouTube para analizar sus temas, encontrar cortes (clips) o generar contenido.",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                url: { type: SchemaType.STRING, description: "La URL completa del video de YouTube." }
              },
              required: ["url"]
            }
          }"""

code = code.replace(old_decl, new_decl)

# 2. Add System Prompt hint
old_prompt = """Si el usuario te pregunta por un contacto, un correo, posteos pasados o documentos, SIEMPRE usa la herramienta 'query_crm_memory' para buscar en la base de datos antes de responder.
      Responde de forma ejecutiva, corporativa y estratégica."""

new_prompt = """Si el usuario te pregunta por un contacto, un correo, posteos pasados o documentos, SIEMPRE usa la herramienta 'query_crm_memory' para buscar en la base de datos antes de responder.
      Si el usuario te pide crear un post o redactar contenido para redes sociales, usa la herramienta 'draft_social_post' para guardarlo en el Social Calendar como borrador para el Community Manager.
      Si el usuario te pide analizar un video de YouTube o sacar clips/cortes, usa la herramienta 'extract_youtube_transcript' para leer el contenido del video.
      Responde de forma ejecutiva, corporativa y estratégica."""

code = code.replace(old_prompt, new_prompt)

# 3. Add Import for YoutubeTranscript
import_statement = "import { YoutubeTranscript } from 'youtube-transcript';\n"
if "import { YoutubeTranscript }" not in code:
    code = code.replace("import * as cheerio from 'cheerio';", "import * as cheerio from 'cheerio';\n" + import_statement)


# 4. Add execution logic
old_exec = """      } else if (call.name === "query_crm_memory") {"""

new_exec = """      } else if (call.name === "draft_social_post") {
        const { title, content, platforms, scheduledDate } = call.args as any;
        
        await prisma.hermesMessage.update({
          where: { id: processingMsgId },
          data: { content: `✍️ [Plugin: Social Calendar] Guardando borrador: "${title}"...` }
        });

        let resultMsg = "";
        try {
          const post = await prisma.socialPost.create({
            data: {
              title,
              content,
              platforms: platforms || 'linkedin,x',
              status: 'draft',
              scheduledDate: new Date(scheduledDate || Date.now()),
              isRecurring: false
            }
          });
          resultMsg = `Borrador guardado exitosamente en el Social Calendar con ID: ${post.id}. El Community Manager podrá revisarlo.`;
        } catch (err: any) {
          resultMsg = `Error al guardar el borrador: ${err.message}`;
        }

        result = await chat.sendMessage(`Resultado de la creación del borrador (draft_social_post):\n\n${resultMsg}\n\nInforma al usuario que el borrador fue guardado exitosamente y está listo para revisión del equipo.`);
        finalContent = result.response.text();

      } else if (call.name === "extract_youtube_transcript") {
        const { url } = call.args as any;
        
        await prisma.hermesMessage.update({
          where: { id: processingMsgId },
          data: { content: `🎥 [Plugin: YouTube] Extrayendo transcripción del video...` }
        });

        let transcriptText = "";
        try {
          const transcript = await YoutubeTranscript.fetchTranscript(url);
          transcriptText = transcript.map(t => `[${(t.offset / 1000).toFixed(0)}s]: ${t.text}`).join('\\n');
          // Limitar a los primeros 25000 caracteres para no desbordar el token limit
          if (transcriptText.length > 25000) {
            transcriptText = transcriptText.substring(0, 25000) + '\\n...[Transcripción truncada por longitud]';
          }
        } catch (err: any) {
          transcriptText = `Error al extraer subtítulos (puede que el video no tenga subtítulos generados): ${err.message}`;
        }

        result = await chat.sendMessage(`Transcripción extraída del video de YouTube (extract_youtube_transcript):\n\n${transcriptText}\n\nUsa esta transcripción para cumplir con lo que el usuario te pidió (resumir, buscar cortes/clips, redactar posts, etc). Si te pidió buscar momentos importantes para clips, indica el segundo exacto [Xs].`);
        finalContent = result.response.text();

      } else if (call.name === "query_crm_memory") {"""

code = code.replace(old_exec, new_exec)

with open(filepath, 'w') as f:
    f.write(code)

print("Social Draft and YouTube plugins injected!")
