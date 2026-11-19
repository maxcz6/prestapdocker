"use client";

import { useState, useEffect } from "react";
import { BarChart3, Wallet, AlertTriangle, PartyPopper, ShieldAlert, Download, Printer, RefreshCw } from "lucide-react";
import { api, type ReportePrestamo, type ReportePago, type ReporteMoroso } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-context";

const formatMoney = (amount?: number | string | null) => {
  if (amount === null || amount === undefined || amount === "") return "S/ 0.00";
  const val = typeof amount === "number" ? amount : parseFloat(String(amount));
  return `S/ ${(isNaN(val) ? 0 : val).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const formatDate = (dateString?: string | null) => {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString.includes("T") ? dateString : dateString + "T00:00:00");
    return isNaN(d.getTime()) ? String(dateString) : d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return String(dateString);
  }
};

type TabKey = "prestamos" | "pagos" | "morosos";

export default function ReportesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("prestamos");

  const [prestamosData, setPrestamosData] = useState<ReportePrestamo[]>([]);
  const [pagosData, setPagosData] = useState<ReportePago[]>([]);
  const [morososData, setMorososData] = useState<ReporteMoroso[]>([]);

  const [loadedTabs, setLoadedTabs] = useState<Set<TabKey>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isAuthorized = !!user?.rol && ["ADMIN", "SUPERVISOR"].includes(user.rol.toUpperCase());

  useEffect(() => {
    if (!isAuthorized) return;
    let cancelled = false;
    const load = async () => {
      if (loadedTabs.has(activeTab)) return;
      setLoading(true);
      setError("");
      try {
        if (activeTab === "prestamos") {
          const data = await api.reportes.prestamos();
          if (!cancelled) setPrestamosData(data);
        } else if (activeTab === "pagos") {
          const data = await api.reportes.pagos();
          if (!cancelled) setPagosData(data);
        } else if (activeTab === "morosos") {
          const data = await api.reportes.morosos();
          if (!cancelled) setMorososData(data);
        }
        if (!cancelled) setLoadedTabs((prev) => new Set(prev).add(activeTab));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error al cargar reporte");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAuthorized]);

  const handleRefresh = async () => {
    setLoadedTabs(new Set());
    setLoading(true);
    setError("");
    try {
      if (activeTab === "prestamos") {
        const data = await api.reportes.prestamos();
        setPrestamosData(data);
      } else if (activeTab === "pagos") {
        const data = await api.reportes.pagos();
        setPagosData(data);
      } else if (activeTab === "morosos") {
        const data = await api.reportes.morosos();
        setMorososData(data);
      }
      setLoadedTabs(new Set([activeTab]));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar reporte");
    } finally {
      setLoading(false);
    }
  };

  const currentCount =
    activeTab === "prestamos" ? prestamosData.length : activeTab === "pagos" ? pagosData.length : morososData.length;

  const handleExportCsv = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    const today = new Date().toISOString().split("T")[0];
    let fileName = `reporte_${activeTab}_${today}.csv`;

    if (activeTab === "prestamos") {
      headers = ["ID Préstamo", "Cliente", "Negocio", "Capital", "Interés (%)", "Monto Interés", "Total", "Pagado", "Saldo Deudor", "Estado"];
      rows = prestamosData.map((p) => [
        p.id_prestamo || "",
        `"${(p.cliente || "").replace(/"/g, '""')}"`,
        `"${(p.negocio || "").replace(/"/g, '""')}"`,
        (p.monto || 0).toFixed(2),
        (p.interes || 0).toString(),
        (p.monto_interes || 0).toFixed(2),
        (p.total || 0).toFixed(2),
        (p.pagado || 0).toFixed(2),
        (p.saldo || 0).toFixed(2),
        p.estado || "",
      ]);
    } else if (activeTab === "pagos") {
      headers = ["Fecha Pago", "Cliente", "Negocio", "ID Préstamo", "Cuota Nro", "Monto Pagado", "Observación"];
      rows = pagosData.map((p) => [
        p.fecha || "",
        `"${(p.cliente || "").replace(/"/g, '""')}"`,
        `"${(p.negocio || "").replace(/"/g, '""')}"`,
        p.prestamo || "",
        (p.cuota || 0).toString(),
        (p.monto || 0).toFixed(2),
        `"${(p.observacion || "").replace(/"/g, '""')}"`,
      ]);
    } else if (activeTab === "morosos") {
      headers = ["Cliente", "Teléfono", "Negocio", "ID Préstamo", "Cuotas Vencidas", "Monto Vencido", "Saldo Total Deudor"];
      rows = morososData.map((m) => [
        `"${(m.cliente || "").replace(/"/g, '""')}"`,
        `"${(m.telefono || "").replace(/"/g, '""')}"`,
        `"${(m.negocio || "").replace(/"/g, '""')}"`,
        m.prestamo || "",
        (m.cuotas_vencidas || 0).toString(),
        (m.monto_vencido || 0).toFixed(2),
        (m.saldo || 0).toFixed(2),
      ]);
    }

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isAuthorized) {
    return (
      <div className="liquid-glass rounded-2xl border border-rose-500/30 p-12 text-center bg-rose-500/10 max-w-2xl mx-auto mt-10">
        <ShieldAlert className="h-12 w-12 mx-auto mb-3 text-rose-500" aria-hidden="true" />
        <h2 className="text-xl font-bold text-text-primary">Acceso Restringido</h2>
        <p className="text-sm text-text-secondary mt-2">
          Este módulo de Reportes Financieros está reservado exclusivamente para Administradores y Supervisores. Tu rol actual es <span className="font-bold text-rose-600 dark:text-rose-400">{user?.rol || "Desconocido"}</span>.
        </p>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "prestamos", label: "Cartera de Préstamos", icon: BarChart3 },
    { key: "pagos", label: "Cobros Realizados", icon: Wallet },
    { key: "morosos", label: "Gestión de Morosidad", icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">Reportes Financieros</h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">Análisis detallado de colocaciones, ingresos y deudas en mora.</p>
        </div>

        {/* Export & Print actions */}
        <div className="flex items-center gap-2.5 self-stretch sm:self-auto print:hidden">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 bg-bg-card hover:bg-bg-hover text-text-primary border border-border-glass text-xs font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            title="Actualizar datos del reporte"
          >
            <RefreshCw className={`h-4 w-4 text-primary ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>
          <button
            onClick={handleExportCsv}
            disabled={loading || currentCount === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 bg-bg-card hover:bg-bg-hover text-text-primary border border-border-glass text-xs font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            title={currentCount === 0 ? "No hay datos para exportar" : "Exportar reporte actual a formato Excel CSV"}
          >
            <Download className="h-4 w-4 text-primary" />
            <span>Exportar Excel (CSV)</span>
          </button>
          <button
            onClick={handlePrint}
            disabled={loading || currentCount === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 bg-bg-card hover:bg-bg-hover text-text-primary border border-border-glass text-xs font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            title="Imprimir o guardar como PDF"
          >
            <Printer className="h-4 w-4 text-primary" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Glass Tabs */}
      <div className="liquid-glass rounded-2xl p-1.5 shadow-sm inline-flex flex-wrap gap-1 border border-border-glass print:hidden">
        <nav className="flex flex-wrap gap-1" aria-label="Pestañas de reportes" role="tablist">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                id={`tab-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                role="tab"
                aria-selected={active}
                aria-controls={`tabpanel-${tab.key}`}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer ${
                  active
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                }`}
              >
                <tab.icon className="h-4 w-4" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {error && (
        <div role="alert" className="liquid-glass rounded-2xl border border-rose-500/30 p-4 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10">
          {error}
        </div>
      )}

      {/* Tab Panels */}
      <div className="liquid-glass rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-text-muted">
            <div className="flex flex-col items-center gap-2">
              <div className="h-7 w-7 animate-spin rounded-full border-3 border-primary/30 border-t-primary" />
              <span className="text-xs font-medium">Generando reporte en tiempo real...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Préstamos report */}
            {activeTab === "prestamos" && (
              <div role="tabpanel" id="tabpanel-prestamos" aria-labelledby="tab-prestamos">
                {prestamosData.length === 0 ? (
                  <div className="p-10 text-center text-text-muted text-xs">No hay préstamos en la cartera.</div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-left text-sm" role="table">
                        <thead>
                          <tr className="border-b border-border-glass bg-bg-card text-text-secondary text-xs uppercase tracking-wider">
                            <th scope="col" className="p-4 pl-6 font-semibold">ID</th>
                            <th scope="col" className="p-4 font-semibold">Cliente</th>
                            <th scope="col" className="p-4 font-semibold hidden sm:table-cell">Negocio</th>
                            <th scope="col" className="p-4 font-semibold">Capital</th>
                            <th scope="col" className="p-4 font-semibold hidden md:table-cell">Interés</th>
                            <th scope="col" className="p-4 font-semibold">Total</th>
                            <th scope="col" className="p-4 font-semibold">Pagado</th>
                            <th scope="col" className="p-4 font-semibold">Saldo Deudor</th>
                            <th scope="col" className="p-4 pr-6 font-semibold">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-glass">
                          {prestamosData.map((p, idx) => (
                            <tr key={p.id_prestamo ? `${p.id_prestamo}-${idx}` : `prestamo-${idx}`} className="hover:bg-bg-hover/80 transition-colors">
                              <td className="p-4 pl-6 font-bold text-primary text-xs">{p.id_prestamo || "—"}</td>
                              <td className="p-4 text-text-primary font-semibold">{p.cliente || "—"}</td>
                              <td className="p-4 text-text-secondary hidden sm:table-cell text-xs">{p.negocio || "—"}</td>
                              <td className="p-4 text-text-primary font-mono text-xs">{formatMoney(p.monto)}</td>
                              <td className="p-4 text-text-secondary hidden md:table-cell font-mono text-xs">{p.interes}%</td>
                              <td className="p-4 text-text-primary font-semibold font-mono text-xs">{formatMoney(p.total)}</td>
                              <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold font-mono text-xs">{formatMoney(p.pagado)}</td>
                              <td className="p-4 text-text-primary font-extrabold font-mono text-xs">{formatMoney(p.saldo)}</td>
                              <td className="p-4 pr-6"><Badge variant={p.estado}>{p.estado}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="block sm:hidden divide-y divide-border-glass">
                      {prestamosData.map((p, idx) => (
                        <div key={p.id_prestamo ? `m-${p.id_prestamo}-${idx}` : `m-p-${idx}`} className="p-4 space-y-2.5 hover:bg-bg-hover/50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-primary text-xs">{p.id_prestamo}</span>
                              <p className="font-bold text-sm text-text-primary mt-0.5">{p.cliente}</p>
                              <p className="text-xs text-text-muted">{p.negocio || "Negocio independiente"}</p>
                            </div>
                            <Badge variant={p.estado}>{p.estado}</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs bg-bg-card/50 p-2.5 rounded-xl border border-border-glass font-mono">
                            <div>
                              <span className="text-text-muted font-sans text-[11px]">Capital ({p.interes}%):</span>
                              <p className="font-semibold text-text-primary">{formatMoney(p.monto)}</p>
                            </div>
                            <div>
                              <span className="text-text-muted font-sans text-[11px]">Total Deuda:</span>
                              <p className="font-semibold text-text-primary">{formatMoney(p.total)}</p>
                            </div>
                            <div>
                              <span className="text-text-muted font-sans text-[11px]">Pagado:</span>
                              <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(p.pagado)}</p>
                            </div>
                            <div>
                              <span className="text-text-muted font-sans text-[11px]">Saldo Deudor:</span>
                              <p className="font-bold text-rose-600 dark:text-rose-400">{formatMoney(p.saldo)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Pagos report */}
            {activeTab === "pagos" && (
              <div role="tabpanel" id="tabpanel-pagos" aria-labelledby="tab-pagos">
                {pagosData.length === 0 ? (
                  <div className="p-10 text-center text-text-muted text-xs">No hay registros de pago.</div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-left text-sm" role="table">
                        <thead>
                          <tr className="border-b border-border-glass bg-bg-card text-text-secondary text-xs uppercase tracking-wider">
                            <th scope="col" className="p-4 pl-6 font-semibold">Fecha</th>
                            <th scope="col" className="p-4 font-semibold">Cliente</th>
                            <th scope="col" className="p-4 font-semibold hidden sm:table-cell">Negocio</th>
                            <th scope="col" className="p-4 font-semibold">Préstamo</th>
                            <th scope="col" className="p-4 font-semibold">Cuota #</th>
                            <th scope="col" className="p-4 font-semibold">Monto Pagado</th>
                            <th scope="col" className="p-4 pr-6 font-semibold hidden md:table-cell">Observación</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-glass">
                          {pagosData.map((p, idx) => (
                            <tr key={p.prestamo ? `${p.prestamo}-${p.cuota}-${idx}` : `pago-${idx}`} className="hover:bg-bg-hover/80 transition-colors">
                              <td className="p-4 pl-6 text-text-primary font-mono text-xs">{formatDate(p.fecha)}</td>
                              <td className="p-4 text-text-primary font-semibold">{p.cliente}</td>
                              <td className="p-4 text-text-secondary hidden sm:table-cell text-xs">{p.negocio}</td>
                              <td className="p-4 text-primary font-bold text-xs">{p.prestamo}</td>
                              <td className="p-4 text-text-primary text-xs font-mono">Cuota #{p.cuota}</td>
                              <td className="p-4 font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-xs">{formatMoney(p.monto)}</td>
                              <td className="p-4 pr-6 text-text-muted hidden md:table-cell text-xs">{p.observacion || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="block sm:hidden divide-y divide-border-glass">
                      {pagosData.map((p, idx) => (
                        <div key={p.prestamo ? `m-${p.prestamo}-${p.cuota}-${idx}` : `m-pago-${idx}`} className="p-4 space-y-2 hover:bg-bg-hover/50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-sm text-text-primary">{p.cliente}</p>
                              <p className="text-xs text-text-muted">{p.negocio || "Negocio independiente"}</p>
                            </div>
                            <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                              {formatMoney(p.monto)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs pt-1">
                            <span className="font-semibold text-primary">{p.prestamo} &bull; Cuota #{p.cuota}</span>
                            <span className="text-text-secondary font-mono">{formatDate(p.fecha)}</span>
                          </div>
                          {p.observacion && (
                            <p className="text-[11px] text-text-muted italic bg-bg-hover/60 p-2 rounded-lg">
                              {p.observacion}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Morosos report */}
            {activeTab === "morosos" && (
              <div role="tabpanel" id="tabpanel-morosos" aria-labelledby="tab-morosos">
                {morososData.length === 0 ? (
                  <div className="p-10 text-center text-text-muted text-xs">
                    <PartyPopper className="h-7 w-7 mx-auto mb-2 text-success" aria-hidden="true" />
                    ¡Excelente! No hay clientes con cuotas vencidas en morosidad.
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-left text-sm" role="table">
                        <thead>
                          <tr className="border-b border-border-glass bg-bg-card text-text-secondary text-xs uppercase tracking-wider">
                            <th scope="col" className="p-4 pl-6 font-semibold">Cliente</th>
                            <th scope="col" className="p-4 font-semibold">Teléfono</th>
                            <th scope="col" className="p-4 font-semibold hidden sm:table-cell">Negocio</th>
                            <th scope="col" className="p-4 font-semibold">Préstamo</th>
                            <th scope="col" className="p-4 font-semibold">Cuotas Vencidas</th>
                            <th scope="col" className="p-4 font-semibold">Monto Vencido</th>
                            <th scope="col" className="p-4 pr-6 font-semibold">Saldo Total Deudor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-glass">
                          {morososData.map((m, idx) => (
                            <tr key={m.prestamo ? `${m.prestamo}-${idx}` : `moroso-${idx}`} className="hover:bg-rose-500/5 transition-colors">
                              <td className="p-4 pl-6 text-text-primary font-bold">{m.cliente}</td>
                              <td className="p-4 text-text-primary font-mono text-xs">{m.telefono}</td>
                              <td className="p-4 text-text-secondary hidden sm:table-cell text-xs">{m.negocio}</td>
                              <td className="p-4 text-primary font-bold text-xs">{m.prestamo}</td>
                              <td className="p-4 font-bold text-rose-600 dark:text-rose-400 text-xs">{m.cuotas_vencidas} vencidas</td>
                              <td className="p-4 font-extrabold text-rose-600 dark:text-rose-400 font-mono text-xs">{formatMoney(m.monto_vencido)}</td>
                              <td className="p-4 pr-6 text-text-primary font-extrabold font-mono text-xs">{formatMoney(m.saldo)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="block sm:hidden divide-y divide-border-glass">
                      {morososData.map((m, idx) => (
                        <div key={m.prestamo ? `m-${m.prestamo}-${idx}` : `m-moroso-${idx}`} className="p-4 space-y-2.5 hover:bg-rose-500/5 transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-sm text-text-primary">{m.cliente}</p>
                              <p className="text-xs text-text-muted">{m.negocio || "Negocio"} &bull; Tel: <span className="font-mono">{m.telefono}</span></p>
                            </div>
                            <span className="font-semibold text-xs text-primary">{m.prestamo}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20 font-mono">
                            <div>
                              <span className="text-rose-700 dark:text-rose-300 font-sans text-[11px]">Vencidas:</span>
                              <p className="font-bold text-rose-600 dark:text-rose-400">{m.cuotas_vencidas} cuotas</p>
                            </div>
                            <div>
                              <span className="text-rose-700 dark:text-rose-300 font-sans text-[11px]">Monto Vencido:</span>
                              <p className="font-bold text-rose-600 dark:text-rose-400">{formatMoney(m.monto_vencido)}</p>
                            </div>
                            <div className="col-span-2 pt-1 border-t border-rose-500/20 flex justify-between items-center">
                              <span className="text-rose-700 dark:text-rose-300 font-sans text-[11px]">Saldo Total Deudor:</span>
                              <span className="font-extrabold text-rose-600 dark:text-rose-400 text-sm">{formatMoney(m.saldo)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

