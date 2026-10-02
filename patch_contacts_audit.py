with open('src/app/api/contacts/route.ts', 'r') as f:
    code = f.read()

old_create = """    const contact = await prisma.contact.create({
      data: {
        tenantId: effectiveTenantId || null,
        name,
        title,
        company,
        email,
        phone,
        whatsapp,
        location,
        bio,
        investorType,
        stage: stage || 'Primer Contacto',
        source: source || 'Manual',
        leadScore: Number(leadScore) || 0,
      },
    });"""

new_create = """    const contact = await prisma.contact.create({
      data: {
        tenantId: effectiveTenantId || null,
        name,
        title,
        company,
        email,
        phone,
        whatsapp,
        location,
        bio,
        investorType,
        stage: stage || 'Primer Contacto',
        source: source || 'Manual',
        leadScore: Number(leadScore) || 0,
      },
    });

    // Crear log de auditoría
    await prisma.systemAuditLog.create({
      data: {
        tenantId: effectiveTenantId || null,
        action: 'CREATE_CONTACT',
        description: `Se ha agregado el contacto '${name}'${company ? ` de ${company}` : ''}.`
      }
    });"""

code = code.replace(old_create, new_create)
with open('src/app/api/contacts/route.ts', 'w') as f:
    f.write(code)
print("Patched contacts route!")
