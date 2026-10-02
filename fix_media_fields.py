import re

with open('src/app/api/hermes/chat/route.ts', 'r') as f:
    code = f.read()

# Fix mediaFile.create
old_create = """          await prisma.mediaFile.create({
            data: {
              tenantId: tenantId || null,
              folderId: folder.id,
              name: `${title}.txt`,
              mimeType: 'text/plain',
              sizeBytes: textContent.length,
              url: 'local://ai-doctrine',
              textContent: textContent
            }
          });"""
new_create = """          await prisma.mediaFile.create({
            data: {
              tenantId: tenantId || null,
              folderId: folder.id,
              name: `${title}.txt`,
              originalName: `${title}.txt`,
              mimeType: 'text/plain',
              size: textContent.length,
              url: 'local://ai-doctrine',
              aiSummary: textContent
            }
          });"""
code = code.replace(old_create, new_create)

# Fix query_crm_memory
old_query = """            } else if (entity === 'files') {
                const files = await prisma.mediaFile.findMany({
                    where: { OR: [ { name: { contains: query, mode: 'insensitive' } }, { textContent: { contains: query, mode: 'insensitive' } } ] }, take: 10
                });
                resultsText = files.length ? JSON.stringify(files.map(f => ({ nombre: f.name, contenido: f.textContent || 'Archivo multimedia (sin texto)' }))) : "No hay archivos o doctrinas.";"""
new_query = """            } else if (entity === 'files') {
                const files = await prisma.mediaFile.findMany({
                    where: { OR: [ { name: { contains: query, mode: 'insensitive' } }, { aiSummary: { contains: query, mode: 'insensitive' } } ] }, take: 10
                });
                resultsText = files.length ? JSON.stringify(files.map(f => ({ nombre: f.name, contenido: f.aiSummary || 'Archivo multimedia (sin texto)' }))) : "No hay archivos o doctrinas.";"""
code = code.replace(old_query, new_query)

with open('src/app/api/hermes/chat/route.ts', 'w') as f:
    f.write(code)

print("Schema fields fixed!")
