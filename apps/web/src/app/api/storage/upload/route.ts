import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { uploadR2Object } from '@/lib/r2';

export async function POST(request: Request) {
  await requireUser();
  const form = await request.formData();
  const file = form.get('file');
  const path = String(form.get('path') ?? '');
  if (!(file instanceof File)) return NextResponse.json({ error: 'File is required' }, { status: 400 });
  if (!/^image\/\d{4}\/[a-z0-9-]+\.(jpg|jpeg|png)$/.test(path)) return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  const publicUrl = await uploadR2Object(path, file);
  return NextResponse.json({ publicUrl, path });
}
