import re

with open('src/components/layout/Sidebar.tsx', 'r') as f:
    code = f.read()

code = code.replace("id: 'voice-notes' as ActiveTab, label: 'Voice Notes'", "id: 'meetings' as ActiveTab, label: 'Meeting Intelligence'")

with open('src/components/layout/Sidebar.tsx', 'w') as f:
    f.write(code)

print("Sidebar item fixed!")
