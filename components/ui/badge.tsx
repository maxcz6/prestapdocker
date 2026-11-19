type BadgeVariant = "activo" | "pendiente" | "pagado" | "pagada" | "vencido" | "vencida" | "cancelado" | "default";

const variantClasses: Record<BadgeVariant, string> = {
  activo: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25",
  pendiente: "bg-amber-500/12 text-amber-700 dark:text-amber-300 border border-amber-500/25",
  pagado: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25",
  pagada: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25",
  vencido: "bg-rose-500/12 text-rose-700 dark:text-rose-300 border border-rose-500/25",
  vencida: "bg-rose-500/12 text-rose-700 dark:text-rose-300 border border-rose-500/25",
  cancelado: "bg-slate-500/12 text-slate-600 dark:text-slate-400 border border-slate-500/25",
  default: "bg-slate-500/12 text-slate-600 dark:text-slate-400 border border-slate-500/25",
};

const pulsingVariants = new Set(["vencido", "vencida"]);

export function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: BadgeVariant | string }) {
  const key = (variant?.toLowerCase() ?? "default") as BadgeVariant;
  const cls = variantClasses[key] ?? variantClasses.default;
  const shouldPulse = pulsingVariants.has(key);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${shouldPulse ? "animate-pulse" : "opacity-70"}`} aria-hidden="true" />
      {children}
    </span>
  );
}
