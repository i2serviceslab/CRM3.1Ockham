import re

with open('src/components/layout/Sidebar.tsx', 'r') as f:
    code = f.read()

code = code.replace("  | 'voice-notes'", "  | 'meetings'")

with open('src/components/layout/Sidebar.tsx', 'w') as f:
    f.write(code)

print("Type ActiveTab fixed!")
