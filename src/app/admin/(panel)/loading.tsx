export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-ink-100" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-ink-100" />)}</div>
      <div className="h-80 animate-pulse rounded-2xl bg-ink-100" />
    </div>
  );
}
