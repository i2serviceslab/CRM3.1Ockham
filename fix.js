const fs = require('fs');
let code = fs.readFileSync('src/app/api/hermes/chat/route.ts', 'utf8');
code = code.replace(
  'if (response.functionCalls && response.functionCalls.length > 0) {\n      const call = response.functionCalls[0];',
  'const calls = response.functionCalls();\n    if (calls && calls.length > 0) {\n      const call = calls[0];'
);
fs.writeFileSync('src/app/api/hermes/chat/route.ts', code);
