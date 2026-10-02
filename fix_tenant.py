import re

with open('src/app/api/hermes/chat/route.ts', 'r') as f:
    code = f.read()

# 1. Add tenantId parameter to processAgenticLoop signature
code = code.replace(
    "async function processAgenticLoop(sessionId: string, promptText: string, worker: string) {",
    "async function processAgenticLoop(sessionId: string, promptText: string, worker: string, tenantId?: string) {"
)

# 2. Add tenantId to the call
code = code.replace(
    "processAgenticLoop(targetSessionId, promptText, worker).catch(console.error);",
    "processAgenticLoop(targetSessionId, promptText, worker, tenantId).catch(console.error);"
)

# 3. Add tenantId to socialPost.create
old_post = """          const post = await prisma.socialPost.create({
            data: {
              title, content, platforms: platforms || 'linkedin,x', status: 'draft',
              scheduledDate: new Date(scheduledDate || Date.now()), isRecurring: false
            }
          });"""

new_post = """          const post = await prisma.socialPost.create({
            data: {
              tenantId: tenantId || null,
              title, content, platforms: platforms || 'linkedin,x', status: 'draft',
              scheduledDate: new Date(scheduledDate || Date.now()), isRecurring: false
            }
          });"""
code = code.replace(old_post, new_post)

# 4. Add tenantId to task.create
old_task = """          await prisma.task.create({
            data: {
              title: `Revisar borrador de publicación: ${title}`,
              description: `Forge ha creado un borrador.\\nPlataformas: ${platforms}\\nFecha: ${scheduledDate}`,
              priority: 'High', status: 'PENDING'
            }
          });"""

new_task = """          await prisma.task.create({
            data: {
              tenantId: tenantId || null,
              title: `Revisar borrador de publicación: ${title}`,
              description: `Forge ha creado un borrador.\\nPlataformas: ${platforms}\\nFecha: ${scheduledDate}`,
              priority: 'High', status: 'PENDING'
            }
          });"""
code = code.replace(old_task, new_task)

# 5. Add tenantId to systemAuditLog.create
old_audit = """          await prisma.systemAuditLog.create({
            data: { action: 'DRAFT_POST', description: `Forge generó un borrador: '${title}'.` }
          });"""

new_audit = """          await prisma.systemAuditLog.create({
            data: { tenantId: tenantId || null, action: 'DRAFT_POST', description: `Forge generó un borrador: '${title}'.` }
          });"""
code = code.replace(old_audit, new_audit)

with open('src/app/api/hermes/chat/route.ts', 'w') as f:
    f.write(code)

print("Tenant fixed!")
