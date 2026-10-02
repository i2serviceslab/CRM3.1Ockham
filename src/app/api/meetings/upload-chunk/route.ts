import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const chunk = formData.get('chunk') as Blob;
    const fileId = formData.get('fileId') as string;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const totalChunks = parseInt(formData.get('totalChunks') as string);

    if (!chunk || !fileId) {
      return NextResponse.json({ success: false, error: 'Missing chunk data' }, { status: 400 });
    }

    const chunkBuffer = Buffer.from(await chunk.arrayBuffer());
    const tempDir = path.join(os.tmpdir(), 'meeting_uploads');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const chunkPath = path.join(tempDir, `${fileId}.part${chunkIndex}`);
    fs.writeFileSync(chunkPath, chunkBuffer);

    // Si es el último chunk, ensamblar el archivo final
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
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
