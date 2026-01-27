export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="w-full py-10 text-center text-sm text-gray-500">{label}</div>
  );
}
