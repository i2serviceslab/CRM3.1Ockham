import re

with open('src/app/api/meetings/transcribe/route.ts', 'r') as f:
    api_code = f.read()

old_logic = """    const arrayBuffer = await request.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return NextResponse.json({ success: false, error: 'Audio payload is empty' }, { status: 400 });
    }
    const buffer = Buffer.from(arrayBuffer);"""

new_logic = """    const arrayBuffer = await request.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return NextResponse.json({ success: false, error: 'Audio payload is empty' }, { status: 400 });
    }
    const buffer = Buffer.from(arrayBuffer);
    
    // DEBUG FILE SIZE
    const receivedMegabytes = (buffer.byteLength / (1024 * 1024)).toFixed(2);"""

api_code = api_code.replace(old_logic, new_logic)

old_error = """      throw new Error("FFmpeg Error: " + stderr.slice(-300));"""
new_error = """      throw new Error(`FFmpeg Error (Recibidos ${receivedMegabytes} MB): ` + stderr.slice(-300));"""

api_code = api_code.replace(old_error, new_error)

with open('src/app/api/meetings/transcribe/route.ts', 'w') as f:
    f.write(api_code)

print("Size debug applied!")
