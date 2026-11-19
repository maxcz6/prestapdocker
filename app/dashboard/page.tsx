"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, FileText, Banknote, Landmark, CircleCheck, Clock, AlertCircle, AlertTriangle, Sparkles, ArrowRight } from "lucide-react";
import { api, type DashboardData } from "@/lib/api-client";
import { StatCard } from "@/components/ui/stat-card";
import { useAuth } from "@/components/auth-context";

function formatMoney(value?: number | string | null): string {
  if (value === null || value === undefined || value === "") return "S/ 0.00";
  const val = typeof value === "number" ? value : parseFloat(String(value));
  return `S/ ${(isNaN(val) ? 0 : val).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.dashboard
      .get()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error al cargar dashboard");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 w-full rounded-2xl glass-skeleton" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl glass-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="liquid-glass rounded-2xl border border-rose-500/30 p-8 text-center bg-rose-500/10">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-rose-500" aria-hidden="true" />
        <p className="text-rose-600 dark:text-rose-400 font-semibold">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="liquid-glass rounded-2xl p-6 sm:p-7 flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Hola, {user?.usuario ?? "Administrador"}
          </h1>
          <p className="text-sm text-text-secondary mt-1 font-medium">
            Resumen en tiempo real de cartera, colocaciones y cobranzas.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2.5">
          {user?.rol === "COBRADOR" ? (
            <Link
              href="/dashboard/pagos"
              className="rounded-xl px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-md shadow-primary/20 transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              + Registrar Cobro / Pago
            </Link>
          ) : (
            <>
              <Link
                href="/dashboard/clientes"
                className="rounded-xl px-4 py-2.5 bg-bg-card hover:bg-bg-hover text-text-primary border border-border-glass text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                + Nuevo Cliente
              </Link>
              <Link
                href="/dashboard/prestamos"
                className="rounded-xl px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-md shadow-primary/20 transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                + Crear Préstamo
              </Link>
              {user?.rol === "ADMIN" && (
                <Link
                  href="/dashboard/usuarios"
                  className="rounded-xl px-4 py-2.5 bg-bg-card hover:bg-bg-hover text-text-primary border border-border-glass text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  + Usuarios
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {/* Interactive Operational Workflow Guide */}
      <div className="liquid-glass rounded-2xl p-5 border border-border-glass">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Flujo Operativo de Microcréditos
            </h2>
            <p className="text-xs text-text-muted mt-0.5">Ciclo de vida para el registro y cobranza de la cartera</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Step 1: Cliente */}
          <Link
            href="/dashboard/clientes"
            className="group relative rounded-xl p-4 liquid-glass-input hover:border-primary/40 transition-all flex items-start gap-3.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm group-hover:bg-primary group-hover:text-white transition-colors">
              1
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-text-primary group-hover:text-primary transition-colors">
                Registrar Cliente
              </h3>
              <p className="text-[11px] text-text-muted mt-0.5 leading-snug">
                Comerciante, DNI, negocio y contacto directo.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto self-center text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* Step 2: Préstamo */}
          <Link
            href="/dashboard/prestamos"
            className="group relative rounded-xl p-4 liquid-glass-input hover:border-primary/40 transition-all flex items-start gap-3.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm group-hover:bg-primary group-hover:text-white transition-colors">
              2
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-text-primary group-hover:text-primary transition-colors">
                Emitir Préstamo
              </h3>
              <p className="text-[11px] text-text-muted mt-0.5 leading-snug">
                Definir capital, tasa % y calendario de cuotas.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto self-center text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* Step 3: Cobro */}
          <Link
            href="/dashboard/pagos"
            className="group relative rounded-xl p-4 liquid-glass-input hover:border-emerald-500/40 transition-all flex items-start gap-3.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-sm group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              3
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-text-primary group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Cobrar Cuotas Diarias
              </h3>
              <p className="text-[11px] text-text-muted mt-0.5 leading-snug">
                Recaudar cuotas y actualizar el saldo en tiempo real.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto self-center text-text-muted group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Clientes"
          value={data.clientes}
          icon={<Users className="h-5 w-5" />}
          variant="info"
        />
        <StatCard
          title="Préstamos Emitidos"
          value={data.prestamos}
          icon={<FileText className="h-5 w-5" />}
          variant="info"
        />
        <StatCard
          title="Capital Prestado"
          value={formatMoney(data.prestado)}
          icon={<Banknote className="h-5 w-5" />}
          variant="default"
        />
        <StatCard
          title="Total Cartera (c/ Interés)"
          value={formatMoney(data.total_cartera)}
          icon={<Landmark className="h-5 w-5" />}
          variant="default"
        />
        <StatCard
          title="Monto Cobrado"
          value={formatMoney(data.cobrado)}
          icon={<CircleCheck className="h-5 w-5" />}
          variant="success"
        />
        <StatCard
          title="Saldo por Cobrar"
          value={formatMoney(data.saldo)}
          icon={<Clock className="h-5 w-5" />}
          variant="warning"
        />
        <StatCard
          title="Cuotas Vencidas"
          value={data.cuotas_vencidas}
          icon={<AlertCircle className="h-5 w-5" />}
          variant="danger"
          subtitle={formatMoney(data.monto_vencido)}
        />
        <StatCard
          title="Clientes Morosos"
          value={data.morosos}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant="danger"
        />
      </div>
    </div>
  );
}

