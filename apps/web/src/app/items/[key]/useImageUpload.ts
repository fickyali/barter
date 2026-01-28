import { useRef, useState, useCallback } from 'react';

export interface UseImageUploadResult {
  imageFile: File | null;
  imagePreviewUrl: string | null;
  error: string | null;
  setImageFile: (file: File | null) => void;
  setImagePreviewUrl: (url: string | null) => void;
  setError: (err: string | null) => void;
  onPickImageFile: (file: File | null) => void;
  reset: () => void;
}

export function useImageUpload(): UseImageUploadResult {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setImageFile(null);
    setImagePreviewUrl(null);
    setError(null);
  }, []);

  const onPickImageFile = useCallback((file: File | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setError(null);
    if (!file) {
      setImageFile(null);
      setImagePreviewUrl(null);
      return;
    }
    if (!file.type || !file.type.startsWith('image/') || file.size === 0) {
      setImageFile(null);
      setImagePreviewUrl(null);
      setError('Foto dari kamera gagal dibaca atau kosong. Silakan coba lagi, pastikan kamera diizinkan, atau gunakan Pilih Foto.');
      return;
    }
    setImageFile(file);
    const url = URL.createObjectURL(file);
    const cacheBustedUrl = url + '?t=' + Date.now();
    previewUrlRef.current = url;
    setImagePreviewUrl(cacheBustedUrl);
  }, []);

  return {
    imageFile,
    imagePreviewUrl,
    error,
    setImageFile,
    setImagePreviewUrl,
    setError,
    onPickImageFile,
    reset,
  };
}
