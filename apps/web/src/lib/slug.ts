export function slugify(input: string): string {
  const normalized = input
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const slug = normalized
    // Drop digits from the base slug (numbers will be used only for collision suffixes like -2, -3).
    .replace(/[^a-z]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

  return slug || 'item';
}

export function isSlug(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length < 1 || value.length > 120) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
