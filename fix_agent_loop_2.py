import os

with open('src/app/api/hermes/chat/route.ts', 'r') as f:
    code = f.read()

start_marker = "let result = await chat.sendMessage(promptText);"
end_marker = "    // Save final response"

start_idx = code.find(start_marker)
end_idx = code.find(end_marker)

new_loop = """let result = await chat.sendMessage(promptText);
    let finalContent = result.response.text();
    let currentResponse = result.response;

    let loopCount = 0;
    const MAX_LOOPS = 5;

    while (currentResponse.functionCalls() && currentResponse.functionCalls()!.length > 0 && loopCount < MAX_LOOPS) {
      loopCount++;
      const calls = currentResponse.functionCalls()!;
      const call = calls[0]; // Process the first call

      if (call.name === "scrape_website") {
        const urlArgs = call.args as any;
        const targetUrl = urlArgs.url;
        await prisma.hermesMessage.update({ where: { id: processingMsgId }, data: { content: `👁️ [Plugin: Scraping] Leyendo sitio web: ${targetUrl}...` } });
        
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
        
        result = await chat.sendMessage(`Resultado (scrape_website):\\n\\n${extractedText}`);
      
      } else if (call.name === "draft_social_post") {
        const { title, content, platforms, scheduledDate } = call.args as any;
        await prisma.hermesMessage.update({ where: { id: processingMsgId }, data: { content: `✍️ [Plugin: Social Calendar] Guardando borrador: "${title}"...` } });
        
        let resultMsg = "";
        try {
          const post = await prisma.socialPost.create({
            data: {
              title, content, platforms: platforms || 'linkedin,x', status: 'draft',
              scheduledDate: new Date(scheduledDate || Date.now()), isRecurring: false
            }
          });
          
          await prisma.task.create({
            data: {
              title: `Revisar borrador de publicación: ${title}`,
              description: `Forge ha creado un borrador.\\nPlataformas: ${platforms}\\nFecha: ${scheduledDate}`,
              priority: 'High', status: 'PENDING'
            }
          });
          await prisma.systemAuditLog.create({
            data: { action: 'DRAFT_POST', description: `Forge generó un borrador: '${title}'.` }
          });
          resultMsg = `Éxito. ID del post: ${post.id}.`;
        } catch (err: any) {
          resultMsg = `Error: ${err.message}`;
        }
        
        result = await chat.sendMessage(`Resultado (draft_social_post): ${resultMsg}`);
        
      } else if (call.name === "extract_youtube_transcript") {
        const { url } = call.args as any;
        await prisma.hermesMessage.update({ where: { id: processingMsgId }, data: { content: `🎥 [Plugin: YouTube] Extrayendo video...` } });
        
        let transcriptText = "";
        try {
          const transcript = await YoutubeTranscript.fetchTranscript(url);
          transcriptText = transcript.map((t: any) => `[${(t.offset / 1000).toFixed(0)}s]: ${t.text}`).join('\\n');
          if (transcriptText.length > 25000) transcriptText = transcriptText.substring(0, 25000) + '...';
        } catch (err: any) {
          transcriptText = `Error: ${err.message}`;
        }
        
        result = await chat.sendMessage(`Resultado (extract_youtube_transcript):\\n\\n${transcriptText}`);
        
      } else if (call.name === "query_crm_memory") {
        const { entity, query } = call.args as any;
        await prisma.hermesMessage.update({ where: { id: processingMsgId }, data: { content: `🧠 [Plugin: Memoria CRM] Buscando "${query}"...` } });
        
        let resultsText = "";
        try {
            if (entity === 'contacts') {
                const contacts = await prisma.contact.findMany({
                    where: { OR: [ { name: { contains: query, mode: 'insensitive' } }, { company: { contains: query, mode: 'insensitive' } } ] }, take: 10
                });
                resultsText = contacts.length ? JSON.stringify(contacts) : "No hay contactos.";
            } else if (entity === 'social_posts') {
                const posts = await prisma.socialPost.findMany({
                    where: { OR: [ { title: { contains: query, mode: 'insensitive' } }, { content: { contains: query, mode: 'insensitive' } } ] }, take: 10
                });
                resultsText = posts.length ? JSON.stringify(posts) : "No hay posts.";
            } else if (entity === 'files') {
                const files = await prisma.mediaFile.findMany({
                    where: { name: { contains: query, mode: 'insensitive' } }, take: 10
                });
                resultsText = files.length ? JSON.stringify(files) : "No hay archivos.";
            }
        } catch (err: any) {
            resultsText = `Error: ${err.message}`;
        }
        
        result = await chat.sendMessage(`Resultado (query_crm_memory):\\n\\n${resultsText}`);
      }

      currentResponse = result.response;
      finalContent = currentResponse.text();
    }
"""

new_code = code[:start_idx] + new_loop + "\n" + code[end_idx:]

with open('src/app/api/hermes/chat/route.ts', 'w') as f:
    f.write(new_code)

print("Agent loop fixed!")
