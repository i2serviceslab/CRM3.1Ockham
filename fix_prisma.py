import re

with open('src/app/api/meetings/transcribe/route.ts', 'r') as f:
    code = f.read()

code = code.replace("data: { name: 'Actas de Reuniones', description: 'Historial de grabaciones', color: '#00E5FF', isSystem: true, tenantId: tenantId || null }", "data: { name: 'Actas de Reuniones', color: '#00E5FF', tenantId: tenantId || null }")
code = code.replace("data: { name: 'Doctrina Forge', description: 'Base de conocimiento de la IA', color: '#FF002C', isSystem: true, tenantId: tenantId || null }", "data: { name: 'Doctrina Forge', color: '#FF002C', tenantId: tenantId || null }")

with open('src/app/api/meetings/transcribe/route.ts', 'w') as f:
    f.write(code)

print("Prisma fixed!")
