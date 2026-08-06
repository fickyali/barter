import crypto from 'crypto';

const service = 's3';
const region = 'auto';

function hmac(key: crypto.BinaryLike, data: string) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function sha256(data: crypto.BinaryLike) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function signingKey(secret: string, date: string) {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), service), 'aws4_request');
}

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function publicUrl(path: string) {
  return `${env('CLOUDFLARE_R2_PUBLIC_URL').replace(/\/$/, '')}/${path}`;
}

async function request(method: string, path: string, body?: Buffer, contentType?: string): Promise<Response> {
  const endpoint = env('CLOUDFLARE_R2_ENDPOINT').replace(/\/$/, '');
  const bucket = env('CLOUDFLARE_R2_BUCKET');
  const accessKey = env('CLOUDFLARE_R2_ACCESS_KEY_ID');
  const secret = env('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
  const url = new URL(`${endpoint}/${bucket}/${path}`);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = amzDate.slice(0, 8);
  const payloadHash = sha256(body ?? Buffer.alloc(0));
  const headers: Record<string, string> = {
    host: url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (contentType) headers['content-type'] = contentType;
  const signedHeaders = Object.keys(headers).sort().join(';');
  const canonicalHeaders = Object.keys(headers).sort().map((key) => `${key}:${headers[key]}\n`).join('');
  const canonicalRequest = [method, url.pathname, url.searchParams.toString(), canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const scope = `${date}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(Buffer.from(canonicalRequest))].join('\n');
  const signature = crypto.createHmac('sha256', signingKey(secret, date)).update(stringToSign).digest('hex');
  const res = await fetch(url, {
    method,
    headers: {
      ...headers,
      authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body: body ? new Uint8Array(body) : undefined,
  });
  if (!res.ok) throw new Error(`R2 ${method} ${path} failed: ${res.status} ${await res.text()}`);
  return res;
}

export async function getR2Object(path: string): Promise<Response> {
  return request('GET', path);
}

export async function uploadR2Object(path: string, file: File) {
  const body = Buffer.from(await file.arrayBuffer());
  await request('PUT', path, body, file.type || 'application/octet-stream');
  return publicUrl(path);
}

export async function deleteR2Object(path: string) {
  await request('DELETE', path);
}
