import re

with open('src/app/api/meetings/transcribe/route.ts', 'r') as f:
    code = f.read()

# Replace the second occurrence of "const fs = require('fs');"
parts = code.split("const fs = require('fs');", 2)
if len(parts) == 3:
    code = parts[0] + "const fs = require('fs');" + parts[1] + parts[2]

with open('src/app/api/meetings/transcribe/route.ts', 'w') as f:
    f.write(code)

print("Duplicate fs removed!")
