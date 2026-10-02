with open('src/app/api/hermes/chat/route.ts', 'r') as f:
    content = f.read()

# Replace the specific malformed join string.
bad_string = "join('\n');"
good_string = "join('\\n');"
content = content.replace(bad_string, good_string)

with open('src/app/api/hermes/chat/route.ts', 'w') as f:
    f.write(content)

print("Fixed!")
