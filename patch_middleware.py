with open('src/middleware.ts', 'r') as f:
    code = f.read()

# Add /api/roadshows to PUBLIC_ROUTES
if "'/api/roadshows'" not in code:
    code = code.replace("'/api/deals',", "'/api/deals',\n  '/api/roadshows',")

with open('src/middleware.ts', 'w') as f:
    f.write(code)
print("Added /api/roadshows to PUBLIC_ROUTES")
