import re

with open('src/app/api/meetings/upload-chunk/route.ts', 'r') as f:
    code = f.read()

old_logic = """    // Si es el último chunk, ensamblar el archivo final
    if (chunkIndex === totalChunks - 1) {
      const finalPath = path.join(tempDir, `${fileId}.raw`);
      const writeStream = fs.createWriteStream(finalPath);
      
      for (let i = 0; i < totalChunks; i++) {
        const partPath = path.join(tempDir, `${fileId}.part${i}`);
        const partBuffer = fs.readFileSync(partPath);
        writeStream.write(partBuffer);
        fs.unlinkSync(partPath); // Borrar pedacito tras ensamblar
      }
      writeStream.end();
      
      return NextResponse.json({ success: true, finalPath });
    }"""

new_logic = """    // Si es el último chunk, ensamblar el archivo final
    if (chunkIndex === totalChunks - 1) {
      const finalPath = path.join(tempDir, `${fileId}.raw`);
      if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath); // Clean just in case
      
      for (let i = 0; i < totalChunks; i++) {
        const partPath = path.join(tempDir, `${fileId}.part${i}`);
        const partBuffer = fs.readFileSync(partPath);
        fs.appendFileSync(finalPath, partBuffer);
        fs.unlinkSync(partPath); // Borrar pedacito tras ensamblar
      }
      
      return NextResponse.json({ success: true, finalPath });
    }"""

code = code.replace(old_logic, new_logic)

with open('src/app/api/meetings/upload-chunk/route.ts', 'w') as f:
    f.write(code)

print("Race condition fixed")
