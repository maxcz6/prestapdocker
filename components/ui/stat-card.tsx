type StatCardProps = {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: "default" | "success" | "danger" | "warning" | "info";
  subtitle?: string;
};

const iconBg: Record<string, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
  warning: "bg-warning/10 text-warning",
  info: "bg-primary/10 text-primary",
};

const accentBorder: Record<string, string> = {
  default: "hover:border-primary/30",
  success: "hover:border-success/30",
  danger: "hover:border-danger/30",
  warning: "hover:border-warning/30",
  info: "hover:border-primary/30",
};

export function StatCard({ title, value, icon, variant = "default", subtitle }: StatCardProps) {
  return (
    <article className={`liquid-glass rounded-2xl p-5 ${accentBorder[variant]} hover:-translate-y-1 transition-all duration-300 ease-out group`}>
      <div className="flex items-center gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg[variant]} transition-transform duration-300 group-hover:scale-110`} aria-hidden="true">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted truncate">{title}</p>
          <p className="text-2xl font-extrabold text-text-primary mt-0.5 tracking-tight leading-none">{typeof value === "number" ? value.toLocaleString("es-PE") : value}</p>
          {subtitle && <p className="text-[11px] text-text-muted mt-1 font-medium truncate">{subtitle}</p>}
        </div>
      </div>
    </article>
  );
}
