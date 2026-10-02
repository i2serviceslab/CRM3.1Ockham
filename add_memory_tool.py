import os

with open('src/app/api/hermes/chat/route.ts', 'r') as f:
    code = f.read()

# 1. Add tool declaration
tool_decl_old = """          {
            name: "scrape_website",
            description: "Extrae y lee el texto principal de una página web (URL). Úsalo cuando el usuario te pida revisar una web, resumir un link o buscar información en una URL específica.",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                url: { type: SchemaType.STRING, description: "La URL completa a leer (ej. https://example.com)" }
              },
              required: ["url"]
            }
          }"""

tool_decl_new = """          {
            name: "scrape_website",
            description: "Extrae y lee el texto principal de una página web (URL). Úsalo cuando el usuario te pida revisar una web, resumir un link o buscar información en una URL específica.",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                url: { type: SchemaType.STRING, description: "La URL completa a leer (ej. https://example.com)" }
              },
              required: ["url"]
            }
          },
          {
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

code = code.replace(tool_decl_old, tool_decl_new)

# 2. Add System Prompt hint
prompt_old = """Si el usuario te pasa un enlace o te pide revisar una web, SIEMPRE usa la herramienta 'scrape_website'.
      Responde de forma ejecutiva, corporativa y estratégica."""

prompt_new = """Si el usuario te pasa un enlace o te pide revisar una web, SIEMPRE usa la herramienta 'scrape_website'.
      Si el usuario te pregunta por un contacto, un correo, posteos pasados o documentos, SIEMPRE usa la herramienta 'query_crm_memory' para buscar en la base de datos antes de responder.
      Responde de forma ejecutiva, corporativa y estratégica."""

code = code.replace(prompt_old, prompt_new)


# 3. Add Tool Execution logic
exec_old = """      if (call.name === "scrape_website") {
        const urlArgs = call.args as any;
        const targetUrl = urlArgs.url;
        
        await prisma.hermesMessage.update({
          where: { id: processingMsgId },
          data: { content: `👁️ [Plugin: Scraping] Leyendo sitio web: ${targetUrl}...` }
        });

        // Execute Tool
        let extractedText = "";
        try {
          const res = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
          const html = await res.text();
          const $ = cheerio.load(html);
          $('script, style, noscript, nav, footer').remove();
          extractedText = $('body').text().replace(/\\s+/g, ' ').trim();
          if (extractedText.length > 15000) extractedText = extractedText.substring(0, 15000) + '...'; // Limit token size
        } catch (err: any) {
          extractedText = `Error al leer la web: ${err.message}`;
        }

        // Return Tool Result to the Agent as a standard user message to avoid 'function' role 400 errors
        result = await chat.sendMessage(`Resultado extraído de la web (scrape_website):\n\n${extractedText}\n\nCon base en esta información, responde a mi solicitud original.`);
        
        finalContent = result.response.text();
      }"""

exec_new = """      if (call.name === "scrape_website") {
        const urlArgs = call.args as any;
        const targetUrl = urlArgs.url;
        
        await prisma.hermesMessage.update({
          where: { id: processingMsgId },
          data: { content: `👁️ [Plugin: Scraping] Leyendo sitio web: ${targetUrl}...` }
        });

        let extractedText = "";
        try {
          const res = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
          const html = await res.text();
          const $ = cheerio.load(html);
          $('script, style, noscript, nav, footer').remove();
          extractedText = $('body').text().replace(/\\s+/g, ' ').trim();
          if (extractedText.length > 15000) extractedText = extractedText.substring(0, 15000) + '...'; 
        } catch (err: any) {
          extractedText = `Error al leer la web: ${err.message}`;
        }

        result = await chat.sendMessage(`Resultado extraído de la web (scrape_website):\n\n${extractedText}\n\nCon base en esta información, responde a mi solicitud original.`);
        finalContent = result.response.text();
      } else if (call.name === "query_crm_memory") {
        const memArgs = call.args as any;
        const { entity, query } = memArgs;
        
        await prisma.hermesMessage.update({
          where: { id: processingMsgId },
          data: { content: `🧠 [Plugin: Memoria CRM] Buscando "${query}" en ${entity}...` }
        });

        let resultsText = "";
        try {
            if (entity === 'contacts') {
                const contacts = await prisma.contact.findMany({
                    where: {
                        OR: [
                            { name: { contains: query, mode: 'insensitive' } },
                            { company: { contains: query, mode: 'insensitive' } },
                            { bio: { contains: query, mode: 'insensitive' } }
                        ]
                    },
                    take: 10
                });
                resultsText = contacts.length ? JSON.stringify(contacts.map(c => ({ nombre: c.name, empresa: c.company, bio: c.bio, email: c.email }))) : "No se encontraron contactos.";
            } else if (entity === 'social_posts') {
                const posts = await prisma.socialPost.findMany({
                    where: {
                        OR: [
                            { title: { contains: query, mode: 'insensitive' } },
                            { content: { contains: query, mode: 'insensitive' } }
                        ]
                    },
                    take: 10
                });
                resultsText = posts.length ? JSON.stringify(posts.map(p => ({ titulo: p.title, contenido: p.content, estado: p.status }))) : "No se encontraron posts en las redes sociales.";
            } else if (entity === 'files') {
                const files = await prisma.mediaFile.findMany({
                    where: { name: { contains: query, mode: 'insensitive' } },
                    take: 10
                });
                resultsText = files.length ? JSON.stringify(files.map(f => ({ archivo: f.name, enlace: f.url }))) : "No se encontraron archivos o documentos.";
            } else {
                resultsText = "Entidad no válida. Usa 'contacts', 'social_posts' o 'files'.";
            }
        } catch (err: any) {
            resultsText = "Error al consultar la base de datos: " + err.message;
        }

        result = await chat.sendMessage(`Resultado de la base de datos CRM para la búsqueda "${query}" en "${entity}":\n\n${resultsText}\n\nCon base en esta información interna, responde al usuario y ayúdalo en su solicitud.`);
        finalContent = result.response.text();
      }"""

code = code.replace(exec_old, exec_new)

with open('src/app/api/hermes/chat/route.ts', 'w') as f:
    f.write(code)

print("Memory plugin injected!")
