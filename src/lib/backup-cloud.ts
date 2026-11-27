import crypto from 'crypto';
import fs from 'fs';

/**
 * Uploads a backup buffer to an S3-compatible bucket (AWS S3 / Cloudflare R2 / Backblaze B2)
 * when S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY are configured.
 */
export async function uploadBackupToCloud(
  filePath: string,
  objectKey: string
): Promise<{ uploaded: boolean; reason?: string }> {
  const endpoint = process.env.S3_ENDPOINT?.replace(/\/$/, '');
  const bucket = process.env.S3_BUCKET;
  const accessKey = process.env.S3_ACCESS_KEY_ID;
  const secretKey = process.env.S3_SECRET_ACCESS_KEY;
  const region = process.env.S3_REGION || 'auto';

  if (!endpoint || !bucket || !accessKey || !secretKey) {
    return { uploaded: false, reason: 'S3/R2 env vars not configured' };
  }

  try {
    const body = fs.readFileSync(filePath);
    const url = new URL(`${endpoint}/${bucket}/${objectKey}`);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = crypto.createHash('sha256').update(body).digest('hex');

    const canonicalHeaders = `host:${url.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = `PUT\n${url.pathname}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;

    const hmac = (key: Buffer | string, data: string) => crypto.createHmac('sha256', key).update(data).digest();
    const kDate = hmac(`AWS4${secretKey}`, dateStamp);
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, 's3');
    const kSigning = hmac(kService, 'aws4_request');
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        Authorization: authorization,
        'Content-Type': 'application/octet-stream',
      },
      body,
    });

    if (!res.ok) {
      return { uploaded: false, reason: `HTTP ${res.status}` };
    }
    return { uploaded: true };
  } catch (err: any) {
    return { uploaded: false, reason: err?.message || 'Upload error' };
  }
}
