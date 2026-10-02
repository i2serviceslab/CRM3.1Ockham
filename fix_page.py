import re

with open('src/app/page.tsx', 'r') as f:
    code = f.read()

code = code.replace("setActiveTab('voice-notes')", "setActiveTab('meetings')")

with open('src/app/page.tsx', 'w') as f:
    f.write(code)

print("page.tsx fixed!")
