export function slugify(input: string): string {
  const normalized = input
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  // Keep at most 5 tokens ("kata") to keep URLs and filenames readable.
  // Tokens include letters and digits so titles like "HP 15 Pro Max" become "hp-15-pro-max".
  const tokens = normalized.match(/[a-z0-9]+/g) ?? [];
  const slug = tokens.slice(0, 5).join('-').slice(0, 80);

  return slug || 'item';
}

export function isSlug(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length < 1 || value.length > 120) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
