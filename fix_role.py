import os

with open('src/app/api/hermes/chat/route.ts', 'r') as f:
    code = f.read()

old_block = """        // Return Tool Result to the Agent
        result = await chat.sendMessage([{
          functionResponse: {
            name: "scrape_website",
            response: { content: extractedText }
          }
        }]);"""

new_block = """        // Return Tool Result to the Agent as a standard user message to avoid 'function' role 400 errors
        result = await chat.sendMessage(`Resultado extraído de la web (scrape_website):\n\n${extractedText}\n\nCon base en esta información, responde a mi solicitud original.`);"""

if old_block in code:
    code = code.replace(old_block, new_block)
    with open('src/app/api/hermes/chat/route.ts', 'w') as f:
        f.write(code)
    print("Fixed!")
else:
    print("Block not found!")
