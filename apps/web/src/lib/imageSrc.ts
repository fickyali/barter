export function r2ImageSrc(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith('.r2.dev')) {
      return `/api/storage/object/${parsed.pathname.replace(/^\/+/, '')}`;
    }
  } catch {
    // not a URL; leave as-is
  }
  return url;
}
