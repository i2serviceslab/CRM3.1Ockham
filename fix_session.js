const fs = require('fs');
let code = fs.readFileSync('src/app/api/hermes/chat/route.ts', 'utf8');

const oldBlock = `    if (!targetSessionId) {
      const newSession = await prisma.hermesSession.create({`;

const newBlock = `    // Ensure session actually exists in DB to prevent foreign key errors
    if (targetSessionId) {
      const exists = await prisma.hermesSession.findUnique({ where: { id: targetSessionId } });
      if (!exists) targetSessionId = null;
    }

    if (!targetSessionId) {
      const newSession = await prisma.hermesSession.create({`;

code = code.replace(oldBlock, newBlock);
fs.writeFileSync('src/app/api/hermes/chat/route.ts', code);
