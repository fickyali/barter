export function extractPublicBucketObjectPath(inputUrl: string, bucket: string): string | null {
  try {
    const url = new URL(inputUrl);
    const path = url.pathname;

    // Common Supabase public URL format:
    // /storage/v1/object/public/<bucket>/<objectPath>
    const marker = `/storage/v1/object/public/${bucket}/`;
    const markerIndex = path.indexOf(marker);
    if (markerIndex !== -1) {
      const objectPath = path.slice(markerIndex + marker.length);
      return objectPath ? decodeURIComponent(objectPath) : null;
    }

    // Some setups may include /render/image/public/<bucket>/...
    const marker2 = `/storage/v1/render/image/public/${bucket}/`;
    const marker2Index = path.indexOf(marker2);
    if (marker2Index !== -1) {
      const objectPath = path.slice(marker2Index + marker2.length);
      return objectPath ? decodeURIComponent(objectPath) : null;
    }

    return null;
  } catch {
    return null;
  }
}
