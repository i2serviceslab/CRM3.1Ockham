import re

with open('src/app/api/hermes/chat/route.ts', 'r') as f:
    code = f.read()

# 1. Update the description and required array for draft_social_post
old_params = """            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING, description: "Título interno o idea principal del post." },
                content: { type: SchemaType.STRING, description: "El contenido final redactado del post (incluyendo hashtags y emojis)." },
                platforms: { type: SchemaType.STRING, description: "Plataformas sugeridas (ej. 'linkedin,twitter,instagram')." },
                scheduledDate: { type: SchemaType.STRING, description: "Fecha y hora sugerida en formato ISO (ej. '2026-10-15T14:00:00Z')." }
              },
              required: ["title", "content", "platforms", "scheduledDate"]
            }"""

new_params = """            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING, description: "Título interno o idea principal del post." },
                content: { type: SchemaType.STRING, description: "El contenido final redactado del post (incluyendo hashtags y emojis)." },
                platforms: { type: SchemaType.STRING, description: "Plataformas sugeridas (ej. 'linkedin,twitter,instagram')." },
                scheduledDate: { type: SchemaType.STRING, description: "Opcional. Fecha y hora en formato ISO. Si el usuario NO especifica una fecha, omite este campo." }
              },
              required: ["title", "content", "platforms"]
            }"""

code = code.replace(old_params, new_params)

# 2. Update the fallback logic in draft_social_post handler
old_handler = """      } else if (call.name === "draft_social_post") {
        const { title, content, platforms, scheduledDate } = call.args as any;
        await prisma.hermesMessage.update({ where: { id: processingMsgId }, data: { content: `✍️ [Plugin: Social Calendar] Guardando borrador: "${title}"...` } });
        
        let resultMsg = "";
        try {
          const post = await prisma.socialPost.create({
            data: {
              tenantId: tenantId || null,
              title, content, platforms: platforms || 'linkedin,x', status: 'draft',
              scheduledDate: new Date(scheduledDate || Date.now()), isRecurring: false
            }
          });"""

new_handler = """      } else if (call.name === "draft_social_post") {
        const { title, content, platforms, scheduledDate } = call.args as any;
        await prisma.hermesMessage.update({ where: { id: processingMsgId }, data: { content: `✍️ [Plugin: Social Calendar] Guardando borrador: "${title}"...` } });
        
        let finalDate = new Date();
        finalDate.setDate(finalDate.getDate() + 1); // Mañana por defecto
        if (scheduledDate) {
          const parsed = new Date(scheduledDate);
          if (!isNaN(parsed.getTime())) {
            finalDate = parsed;
          }
        }

        let resultMsg = "";
        try {
          const post = await prisma.socialPost.create({
            data: {
              tenantId: tenantId || null,
              title, content, platforms: platforms || 'linkedin,x', status: 'draft',
              scheduledDate: finalDate, isRecurring: false
            }
          });"""

code = code.replace(old_handler, new_handler)

# 3. Update the task description to reflect finalDate
old_task = """              description: `Forge ha creado un borrador.\\nPlataformas: ${platforms}\\nFecha: ${scheduledDate}`,"""
new_task = """              description: `Forge ha creado un borrador.\\nPlataformas: ${platforms}\\nFecha: ${finalDate.toISOString()}`,"""
code = code.replace(old_task, new_task)

with open('src/app/api/hermes/chat/route.ts', 'w') as f:
    f.write(code)

print("Date logic updated!")
