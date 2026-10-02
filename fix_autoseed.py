import re

with open('src/lib/auto-seed.ts', 'r') as f:
    code = f.read()

code = code.replace("          customDomain: 'homunculus-host-coppergiant-crm.wu48i0.easypanel.host',", "")

with open('src/lib/auto-seed.ts', 'w') as f:
    f.write(code)
print("Auto-seed fixed!")
