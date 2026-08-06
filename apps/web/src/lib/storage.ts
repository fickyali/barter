export function extractPublicObjectPath(inputUrl: string): string | null {
  try {
    const path = new URL(inputUrl).pathname.replace(/^\//, '');
    return path || null;
  } catch {
    return null;
  }
}
