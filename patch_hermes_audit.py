with open('src/app/api/hermes/chat/route.ts', 'r') as f:
    code = f.read()

old_post_create = """          const post = await prisma.socialPost.create({
            data: {
              title,
              content,
              platforms: platforms || 'linkedin,x',
              status: 'draft',
              scheduledDate: new Date(scheduledDate || Date.now()),
              isRecurring: false
            }
          });
          resultMsg = `Borrador guardado exitosamente en el Social Calendar con ID: ${post.id}. El Community Manager podrá revisarlo.`;"""

new_post_create = """          const post = await prisma.socialPost.create({
            data: {
              title,
              content,
              platforms: platforms || 'linkedin,x',
              status: 'draft',
              scheduledDate: new Date(scheduledDate || Date.now()),
              isRecurring: false
            }
          });
          
          // Crear tarea para el equipo en el Kanban
          await prisma.task.create({
            data: {
              title: `Revisar borrador de publicación: ${title}`,
              description: `Forge ha creado un nuevo borrador de red social basado en instrucciones de IA.\\nPlataformas: ${platforms}\\nFecha sugerida: ${scheduledDate}\\nPor favor ir al Social Calendar para revisarlo y publicarlo.`,
              priority: 'High',
              status: 'PENDING'
            }
          });

          // Log de auditoría
          await prisma.systemAuditLog.create({
            data: {
              action: 'DRAFT_POST',
              description: `Forge (IA) generó un borrador para publicación: '${title}'. Tarea asignada al equipo.`
            }
          });

          resultMsg = `Borrador guardado exitosamente en el Social Calendar con ID: ${post.id}. También creé una Tarea en el Pipeline de Seguimiento para que el equipo lo revise.`;"""

code = code.replace(old_post_create, new_post_create)
with open('src/app/api/hermes/chat/route.ts', 'w') as f:
    f.write(code)
print("Patched hermes route!")
