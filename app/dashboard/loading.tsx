export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando contenido">
      {/* Title skeleton */}
      <div className="h-8 w-48 glass-skeleton" />

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border-glass bg-bg-card p-5">
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 glass-skeleton rounded-xl" />
              <div className="space-y-2.5 flex-1">
                <div className="h-3 w-20 glass-skeleton" />
                <div className="h-6 w-16 glass-skeleton" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-2xl border border-border-glass bg-bg-card p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 glass-skeleton" />
        ))}
      </div>
      <span className="sr-only">Cargando contenido</span>
    </div>
  );
}
