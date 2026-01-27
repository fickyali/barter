'use client';

import imageCompression from 'browser-image-compression';

const MAX_UPLOAD_BYTES = 1_000_000; // 1MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png']);

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export function validateImageFile(file: File): void {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error('Format foto harus JPG atau PNG.');
  }
}

export async function prepareImageForUpload(file: File): Promise<File> {
  validateImageFile(file);

  // If already within limits, upload as-is.
  if (file.size <= MAX_UPLOAD_BYTES) return file;

  const options: Parameters<typeof imageCompression>[1] = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    // Keep original file type to avoid unexpected transparency loss.
    fileType: file.type,
  };

  const compressed = await imageCompression(file, options);

  if (compressed.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `Foto masih terlalu besar setelah kompresi (${formatBytes(compressed.size)}). Pilih foto lain atau crop lebih kecil.`,
    );
  }

  // Return a File (not just Blob) so upload() keeps a sane filename.
  return new File([compressed], file.name, { type: compressed.type || file.type });
}

export function extensionForMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  return 'jpg';
}
