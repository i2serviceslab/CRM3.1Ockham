import re

with open('src/app/api/roadshows/route.ts', 'r') as f:
    code = f.read()

cors_headers = """
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}
"""

if "corsHeaders" not in code:
    # Insert after imports
    code = code.replace("import { getSession, getEffectiveTenantId } from '@/lib/auth';", 
                       "import { getSession, getEffectiveTenantId } from '@/lib/auth';\n" + cors_headers)
    
    # Update GET response
    code = code.replace("return NextResponse.json({ success: true, events });",
                       "return NextResponse.json({ success: true, events }, { headers: corsHeaders });")

with open('src/app/api/roadshows/route.ts', 'w') as f:
    f.write(code)

print("CORS added to roadshows API!")
