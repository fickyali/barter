import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { deleteR2Object, getR2Object } from '@/lib/r2';

const OBJECT_PATH = /^image\/\d{4}\/[a-z0-9-]+\.(jpg|jpeg|png)$/;

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const objectPath = path.join('/');
  if (!OBJECT_PATH.test(objectPath)) return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  const res = await getR2Object(objectPath);
  const body = new Uint8Array(await res.arrayBuffer());
  return new NextResponse(body, {
    headers: {
      'content-type': res.headers.get('content-type') || 'application/octet-stream',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  await requireUser();
  const { path } = await params;
  const objectPath = path.join('/');
  if (!OBJECT_PATH.test(objectPath)) return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  await deleteR2Object(objectPath);
  return NextResponse.json({ ok: true });
}
