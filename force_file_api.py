import re

with open('src/app/api/meetings/transcribe/route.ts', 'r') as f:
    api_code = f.read()

# Force the file api for everything > 100KB
api_code = api_code.replace("if (buffer.length > 15 * 1024 * 1024) {", "if (buffer.length > 100 * 1024) {")

with open('src/app/api/meetings/transcribe/route.ts', 'w') as f:
    f.write(api_code)

print("Forced File API for all audio!")
