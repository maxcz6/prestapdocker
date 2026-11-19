"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { api, type PrestamoConDetalle } from "@/lib/api-client";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import type { Cuota } from "@/types/domain";

const formatMoney = (amount?: number | string | null) => {
  if (amount === null || amount === undefined || amount === "") return "S/ 0.00";
  const val = typeof amount === "number" ? amount : parseFloat(String(amount));
  return `S/ ${(isNaN(val) ? 0 : val).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString.includes("T") ? dateString : dateString + "T00:00:00");
    return isNaN(d.getTime()) ? String(dateString) : d.toLocaleDateString("es-PE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return String(dateString);
  }
};

export default function PrestamoDetailPage({ params }: { params: Promise<{ id_prestamo: string }> }) {
  const { id_prestamo } = use(params);

  const [prestamo, setPrestamo] = useState<PrestamoConDetalle | null>(null);
  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentCuota, setCurrentCuota] = useState<Cuota | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});

  const [paymentForm, setPaymentForm] = useState({
    monto_pagado: "",
    fecha_pago: new Date().toISOString().split("T")[0],
    observacion: "",
  });

  const { toast } = useToast();

  const fetchPrestamo = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [prestamoData, cuotasData] = await Promise.all([
        api.prestamos.getById(id_prestamo),
        api.cuotas.listByPrestamo(id_prestamo),
      ]);

      if (prestamoData) setPrestamo(prestamoData);
      setCuotas(cuotasData);
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error cargando detalles", variant: "error" });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.prestamos.getById(id_prestamo), api.cuotas.listByPrestamo(id_prestamo)])
      .then(([prestamoData, cuotasData]) => {
        if (cancelled) return;
        if (prestamoData) setPrestamo(prestamoData);
        setCuotas(cuotasData);
        setLoading(false);
      })
      .catch((err) => { if (!cancelled) { toast({ title: "Error", description: err instanceof Error ? err.message : "Error cargando detalles", variant: "error" }); setLoading(false); } });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id_prestamo]);

  const openPaymentModal = (cuota: Cuota) => {
    setCurrentCuota(cuota);
    setPaymentErrors({});
    setPaymentForm({
      monto_pagado: cuota.monto.toString(),
      fecha_pago: new Date().toISOString().split("T")[0],
      observacion: "",
    });
    setIsPaymentModalOpen(true);
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCuota || !prestamo) return;

    const newErrors: Record<string, string> = {};
    const monto = parseFloat(paymentForm.monto_pagado);
    if (isNaN(monto) || monto <= 0 || monto > 50000) {
      newErrors.monto = "El monto debe ser mayor a S/ 0 y menor a S/ 50,000";
    }
    if (!paymentForm.fecha_pago) {
      newErrors.fecha = "Seleccione una fecha de cobro";
    }

    if (Object.keys(newErrors).length > 0) {
      setPaymentErrors(newErrors);
      return;
    }
    setPaymentErrors({});

    setSubmitting(true);
    try {
      const result = await api.pagos.create({
        id_prestamo: prestamo.id_prestamo,
        id_cuota: currentCuota.id_cuota,
        monto_pagado: monto,
        fecha_pago: paymentForm.fecha_pago,
        observacion: paymentForm.observacion,
      });
      toast({ title: "Pago Registrado", description: `Cuota #${currentCuota.numero_cuota} pagada. Préstamo ahora está ${result.estadoPrestamo}`, variant: "success" });
      setIsPaymentModalOpen(false);
      fetchPrestamo(true);
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error al registrar pago", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-40 rounded-xl liquid-glass-input" />
        <div className="h-44 rounded-2xl liquid-glass" />
        <div className="h-72 rounded-2xl liquid-glass" />
      </div>
    );
  }

  if (!prestamo) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/prestamos" className="text-primary hover:underline text-xs font-semibold">&larr; Volver a Préstamos</Link>
        <div className="liquid-glass rounded-2xl p-10 text-center shadow-xl">
          <p className="text-text-muted">No se encontró el préstamo <strong className="text-primary">{id_prestamo}</strong>.</p>
        </div>
      </div>
    );
  }

  const cuotasPagadas = cuotas.filter((c) => c.estado === "PAGADA").length;
  const cuotasTotal = cuotas.length;
  const progressPercent = cuotasTotal > 0 ? Math.round((cuotasPagadas / cuotasTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard/prestamos" className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-semibold mb-2">
          &larr; Volver a lista de Préstamos
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Préstamo {prestamo.id_prestamo}
          </h1>
          <Badge variant={prestamo.estado}>{prestamo.estado}</Badge>
        </div>
      </div>

      {/* Summary Card with Liquid Glass Progress */}
      <div className="liquid-glass rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">Cliente</p>
            <p className="text-sm font-bold text-text-primary truncate">{prestamo.cliente?.nombres_apellidos ?? prestamo.id_cliente}</p>
            <p className="text-xs text-text-muted">{prestamo.cliente?.nombre_negocio ?? ""}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">Capital / Total</p>
            <p className="text-sm font-bold text-text-primary font-mono">{formatMoney(prestamo.monto)}</p>
            <p className="text-xs text-text-muted font-mono">{formatMoney(prestamo.total_pagar)} con int.</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">Cuota Diaria</p>
            <p className="text-base font-extrabold text-primary font-mono">{formatMoney(prestamo.cuota_diaria)}</p>
            <p className="text-xs text-text-muted">{prestamo.dias} días</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">Cobrado</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatMoney(prestamo.saldo?.pagado ?? 0)}</p>
            <p className="text-xs text-text-muted">{cuotasPagadas} de {cuotasTotal} cuotas</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">Saldo Deudor</p>
            <p className="text-base font-extrabold text-text-primary font-mono">{formatMoney(prestamo.saldo?.saldo ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">Período</p>
            <p className="text-xs font-medium text-text-primary">{prestamo.fecha_inicio}</p>
            <p className="text-xs text-text-muted">al {prestamo.fecha_fin}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="pt-2 border-t border-border-glass">
          <div className="flex justify-between text-xs font-semibold text-text-secondary mb-1.5">
            <span>Progreso de Amortización</span>
            <span className="text-primary font-bold">{progressPercent}% completado</span>
          </div>
          <div className="h-3 rounded-full bg-slate-200/50 dark:bg-slate-800/50 overflow-hidden p-0.5 border border-border-glass">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 shadow-sm transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Cuotas Table */}
      <div className="liquid-glass rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-border-glass flex items-center justify-between">
          <h2 className="text-base font-bold text-text-primary tracking-tight">Calendario y Control de Cuotas Diarias</h2>
          <span className="text-xs text-text-muted font-medium">Cuota fija: <strong className="text-text-primary">{formatMoney(prestamo.cuota_diaria)}</strong></span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" role="table">
            <thead>
              <tr className="border-b border-border-glass bg-bg-card text-text-secondary text-xs uppercase tracking-wider">
                <th scope="col" className="p-4 pl-6 font-semibold">Nro</th>
                <th scope="col" className="p-4 font-semibold">Fecha Vencimiento</th>
                <th scope="col" className="p-4 font-semibold">Monto Cuota</th>
                <th scope="col" className="p-4 font-semibold">Estado</th>
                <th scope="col" className="p-4 pr-6 font-semibold text-right">Acción de Cobro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-glass">
              {cuotas.map((cuota) => (
                <tr key={cuota.id_cuota} className="hover:bg-bg-hover/80 transition-colors">
                  <td className="p-4 pl-6 font-bold text-text-primary text-xs">#{cuota.numero_cuota}</td>
                  <td className="p-4 text-text-primary font-mono text-xs">
                    {formatDate(cuota.fecha_vencimiento)}
                  </td>
                  <td className="p-4 text-text-primary font-semibold font-mono text-xs">{formatMoney(cuota.monto)}</td>
                  <td className="p-4"><Badge variant={cuota.estado}>{cuota.estado}</Badge></td>
                  <td className="p-4 pr-6 text-right">
                    {cuota.estado === "PAGADA" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-1">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" /> Pagada
                      </span>
                    ) : (
                      <button
                        onClick={() => openPaymentModal(cuota)}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                          cuota.estado === "VENCIDA"
                            ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/25 animate-pulse"
                            : "bg-primary hover:bg-primary-hover shadow-primary/25"
                        }`}
                        aria-label={`Registrar cobro de cuota ${cuota.numero_cuota}`}
                      >
                        Registrar Pago &rarr;
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal open={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={`Registrar Cobro — Cuota #${currentCuota?.numero_cuota ?? ""}`}>
        <form onSubmit={handleRegisterPayment} className="space-y-4" noValidate>
          <Field
            label="Monto Cobrado (S/)"
            id="pago-monto"
            required
            type="number"
            step="0.01"
            min="0.01"
            max="50000"
            maxLength={10}
            value={paymentForm.monto_pagado}
            onChange={(e) => setPaymentForm({ ...paymentForm, monto_pagado: e.target.value })}
            disabled={submitting}
            error={paymentErrors.monto}
          />
          <Field
            label="Fecha de Cobro"
            id="pago-fecha"
            required
            type="date"
            value={paymentForm.fecha_pago}
            onChange={(e) => setPaymentForm({ ...paymentForm, fecha_pago: e.target.value })}
            disabled={submitting}
            error={paymentErrors.fecha}
          />
          <Field
            label="Observación / Método"
            id="pago-obs"
            type="text"
            maxLength={200}
            value={paymentForm.observacion}
            onChange={(e) => setPaymentForm({ ...paymentForm, observacion: e.target.value })}
            placeholder="Ej. Efectivo en puesto, Yape, Plin..."
            disabled={submitting}
          />
          <div className="flex justify-end gap-2 pt-4 border-t border-border-glass">
            <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? "Registrando Pago..." : "Confirmar Cobro"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
