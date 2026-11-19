"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, PlusCircle, AlertCircle } from "lucide-react";
import { api, type PagoConDetalle, type PrestamoConDetalle } from "@/lib/api-client";
import { Modal } from "@/components/ui/modal";
import { Field, SelectField } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
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
    return isNaN(d.getTime()) ? String(dateString) : d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return String(dateString);
  }
};

export default function PagosPage() {
  const [pagos, setPagos] = useState<PagoConDetalle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Payment registration modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prestamosActivos, setPrestamosActivos] = useState<PrestamoConDetalle[]>([]);
  const [loadingPrestamos, setLoadingPrestamos] = useState(false);
  const [selectedPrestamoId, setSelectedPrestamoId] = useState("");
  const [prestamoSearchTerm, setPrestamoSearchTerm] = useState("");
  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [loadingCuotas, setLoadingCuotas] = useState(false);
  const [selectedCuotaId, setSelectedCuotaId] = useState("");
  const [montoPagado, setMontoPagado] = useState("");
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split("T")[0]);
  const [observacion, setObservacion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { toast } = useToast();

  const fetchPagos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.pagos.list();
      const sorted = [...data].sort(
        (a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime()
      );
      setPagos(sorted);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar historial de pagos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPagos();
  }, [fetchPagos]);

  // Open payment registration modal
  const handleOpenModal = async () => {
    setIsModalOpen(true);
    setFormErrors({});
    setSelectedPrestamoId("");
    setPrestamoSearchTerm("");
    setCuotas([]);
    setSelectedCuotaId("");
    setMontoPagado("");
    setObservacion("");
    setFechaPago(new Date().toISOString().split("T")[0]);

    setLoadingPrestamos(true);
    try {
      const data = await api.prestamos.list();
      const activos = data.filter((p) => p.estado !== "CANCELADO" && p.estado !== "PAGADO");
      setPrestamosActivos(activos);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudieron cargar los préstamos activos",
        variant: "error",
      });
    } finally {
      setLoadingPrestamos(false);
    }
  };

  // When prestamo is selected, fetch cuotas
  const handlePrestamoChange = async (prestamoId: string) => {
    setSelectedPrestamoId(prestamoId);
    setSelectedCuotaId("");
    setMontoPagado("");
    if (!prestamoId) {
      setCuotas([]);
      return;
    }

    setLoadingCuotas(true);
    try {
      const cuotasData = await api.cuotas.listByPrestamo(prestamoId);
      const pendientes = cuotasData.filter((c) => c.estado !== "PAGADA");
      setCuotas(pendientes);

      // Auto-select first pending cuota
      if (pendientes.length > 0) {
        const first = pendientes[0];
        setSelectedCuotaId(first.id_cuota);
        setMontoPagado(first.monto.toString());
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Error al cargar las cuotas del préstamo",
        variant: "error",
      });
    } finally {
      setLoadingCuotas(false);
    }
  };

  // Filtered loans for combobox
  const filteredPrestamosActivos = prestamosActivos.filter((p) => {
    const term = prestamoSearchTerm.toLowerCase().trim();
    if (!term) return true;
    const name = p.cliente?.nombres_apellidos?.toLowerCase() ?? "";
    const dni = p.cliente?.dni ?? "";
    const negocio = p.cliente?.nombre_negocio?.toLowerCase() ?? "";
    const id = p.id_prestamo.toLowerCase();
    return name.includes(term) || dni.includes(term) || negocio.includes(term) || id.includes(term);
  });

  const selectedPrestamoObj = prestamosActivos.find((p) => p.id_prestamo === selectedPrestamoId);

  // When cuota is selected
  const handleCuotaChange = (cuotaId: string) => {
    setSelectedCuotaId(cuotaId);
    const cuota = cuotas.find((c) => c.id_cuota === cuotaId);
    if (cuota) {
      setMontoPagado(cuota.monto.toString());
    }
  };

  // Submit payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!selectedPrestamoId) errors.prestamo = "Seleccione un préstamo";
    if (!selectedCuotaId) errors.cuota = "Seleccione una cuota";
    const monto = parseFloat(montoPagado);
    if (!monto || monto <= 0) errors.monto = "Ingrese un monto válido";
    if (monto > 50000) errors.monto = "El monto no puede exceder S/ 50,000";
    if (!fechaPago) errors.fecha = "Seleccione una fecha";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    setSubmitting(true);
    try {
      const result = await api.pagos.create({
        id_prestamo: selectedPrestamoId,
        id_cuota: selectedCuotaId,
        monto_pagado: monto,
        fecha_pago: fechaPago,
        observacion: observacion.trim(),
      });

      const cuotaObj = cuotas.find((c) => c.id_cuota === selectedCuotaId);
      toast({
        title: "Cobro Registrado",
        description: `Cuota #${cuotaObj?.numero_cuota || ""} registrada con éxito. Estado del préstamo: ${result.estadoPrestamo}`,
        variant: "success",
      });

      setIsModalOpen(false);
      fetchPagos();
    } catch (err) {
      toast({
        title: "Error al registrar pago",
        description: err instanceof Error ? err.message : "No se pudo registrar el pago",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPagos = pagos.filter((p) => {
    const term = searchTerm.toLowerCase();
    const clienteName = p.cliente?.nombres_apellidos?.toLowerCase() ?? "";
    const negocio = p.cliente?.nombre_negocio?.toLowerCase() ?? "";
    const prestamo = p.id_prestamo.toLowerCase();
    return clienteName.includes(term) || negocio.includes(term) || prestamo.includes(term);
  });

  const totalCobrado = filteredPagos.reduce((sum, p) => sum + (p.monto_pagado || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">Historial de Cobranzas</h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">Registro cronológico de pagos recaudados e ingresados a caja.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="liquid-glass rounded-2xl px-5 py-3 shadow-md border border-emerald-500/30 bg-emerald-500/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Recaudación Filtrada</p>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{formatMoney(totalCobrado)}</p>
          </div>
          <button
            onClick={handleOpenModal}
            className="btn btn-primary"
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            + Registrar Cobro
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="liquid-glass rounded-2xl border border-rose-500/30 p-4 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10">
          {error}
        </div>
      )}

      {/* Table & Cards Container */}
      <div className="liquid-glass rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-border-glass flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="w-full sm:max-w-md">
            <label htmlFor="search-pagos" className="sr-only">Buscar cobranza</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" aria-hidden="true" />
              <input
                id="search-pagos"
                type="text"
                placeholder="Buscar por cliente, negocio o ID préstamo..."
                maxLength={60}
                className="w-full rounded-2xl liquid-glass-input pl-10 pr-4 py-2.5 text-xs sm:text-sm text-text-primary placeholder:text-text-muted"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="text-xs text-text-muted font-medium self-end sm:self-center">
            Mostrando <span className="text-text-primary font-bold">{filteredPagos.length}</span> pagos registrados
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-text-muted">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <span>Cargando historial de pagos...</span>
            </div>
          </div>
        ) : filteredPagos.length === 0 ? (
          <div className="p-10 text-center text-text-muted text-xs">
            No se encontraron pagos con ese criterio de búsqueda.
          </div>
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
                  {filteredPagos.map((pago, idx) => (
                    <tr key={pago.id_pago ? `${pago.id_pago}-${idx}` : `pago-${idx}`} className="hover:bg-bg-hover/80 transition-colors">
                      <td className="p-4 pl-6 text-text-primary font-mono text-xs">{formatDate(pago.fecha_pago)}</td>
                      <td className="p-4 text-text-primary font-semibold">{pago.cliente?.nombres_apellidos ?? "—"}</td>
                      <td className="p-4 text-text-secondary hidden sm:table-cell text-xs">{pago.cliente?.nombre_negocio ?? "—"}</td>
                      <td className="p-4 text-primary font-bold text-xs">{pago.id_prestamo}</td>
                      <td className="p-4 text-text-primary text-xs font-mono">Cuota #{pago.numero_cuota}</td>
                      <td className="p-4 font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-xs">{formatMoney(pago.monto_pagado)}</td>
                      <td className="p-4 pr-6 text-text-muted hidden md:table-cell text-xs">{pago.observacion || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block sm:hidden divide-y divide-border-glass">
              {filteredPagos.map((pago, idx) => (
                <div key={pago.id_pago ? `m-${pago.id_pago}-${idx}` : `m-pago-${idx}`} className="p-4 space-y-2 hover:bg-bg-hover/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm text-text-primary">{pago.cliente?.nombres_apellidos ?? "Cliente no identificado"}</p>
                      <p className="text-xs text-text-muted">{pago.cliente?.nombre_negocio || "Negocio independiente"}</p>
                    </div>
                    <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatMoney(pago.monto_pagado)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="font-semibold text-primary">{pago.id_prestamo} &bull; Cuota #{pago.numero_cuota}</span>
                    <span className="text-text-secondary font-mono">{formatDate(pago.fecha_pago)}</span>
                  </div>
                  {pago.observacion && (
                    <p className="text-[11px] text-text-muted italic bg-bg-hover/60 p-2 rounded-lg">
                      {pago.observacion}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal Registrar Cobro Rápido con Combobox */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Cobro de Cuota" maxWidth="max-w-lg">
        <form onSubmit={handleSubmitPayment} className="space-y-4" noValidate>
          {loadingPrestamos ? (
            <div className="p-6 text-center text-xs text-text-muted">Cargando préstamos activos...</div>
          ) : prestamosActivos.length === 0 ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>No hay préstamos activos pendientes de cobro en este momento.</span>
            </div>
          ) : (
            <>
              {/* Combobox interactivo de Préstamos */}
              <div>
                <label htmlFor="search-prestamo-modal" className="text-xs font-semibold text-text-primary block mb-1">
                  Buscar Préstamo / Cliente <span className="text-rose-500">*</span>
                </label>

                {selectedPrestamoObj ? (
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm text-text-primary">{selectedPrestamoObj.cliente?.nombres_apellidos || "Cliente"}</p>
                      <p className="text-xs text-text-secondary">
                        <span className="font-mono text-primary font-bold">{selectedPrestamoObj.id_prestamo}</span> &bull; Saldo: <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{formatMoney(selectedPrestamoObj.saldo?.saldo)}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedPrestamoId(""); setSelectedCuotaId(""); setMontoPagado(""); setCuotas([]); }}
                      className="text-xs text-primary hover:underline font-semibold px-2 py-1 bg-bg-card rounded-lg border border-border-glass cursor-pointer"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                      <input
                        id="search-prestamo-modal"
                        type="text"
                        placeholder="Escribe nombre, DNI, negocio o ID..."
                        maxLength={60}
                        value={prestamoSearchTerm}
                        onChange={(e) => setPrestamoSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl liquid-glass-input text-text-primary placeholder:text-text-muted"
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto divide-y divide-border-glass rounded-xl border border-border-glass liquid-glass">
                      {filteredPrestamosActivos.length === 0 ? (
                        <div className="p-3 text-xs text-text-muted text-center">No coinciden préstamos activos</div>
                      ) : (
                        filteredPrestamosActivos.map((p) => (
                          <button
                            key={p.id_prestamo}
                            type="button"
                            onClick={() => handlePrestamoChange(p.id_prestamo)}
                            className="w-full text-left p-2.5 hover:bg-bg-hover/80 transition-colors flex justify-between items-center text-xs cursor-pointer"
                          >
                            <div>
                              <p className="font-bold text-text-primary">{p.cliente?.nombres_apellidos || "Sin nombre"}</p>
                              <p className="text-[11px] text-text-muted">{p.id_prestamo} &bull; {p.cliente?.nombre_negocio || "Negocio"}</p>
                            </div>
                            <span className="font-mono font-bold text-primary text-[11px]">
                              Saldo: {formatMoney(p.saldo?.saldo)}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Hidden / accessible fallback select for automated tests */}
                <select
                  id="cobro-prestamo"
                  value={selectedPrestamoId}
                  onChange={(e) => handlePrestamoChange(e.target.value)}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <option value="">Seleccione un préstamo activo...</option>
                  {prestamosActivos.map((p) => (
                    <option key={p.id_prestamo} value={p.id_prestamo}>
                      {p.id_prestamo} — {p.cliente?.nombres_apellidos || "Cliente"} (Saldo: {formatMoney(p.saldo?.saldo)})
                    </option>
                  ))}
                </select>

                {formErrors.prestamo && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1">{formErrors.prestamo}</p>
                )}
              </div>

              {loadingCuotas ? (
                <div className="p-3 text-center text-xs text-text-muted">Cargando cuotas...</div>
              ) : selectedPrestamoId && cuotas.length === 0 ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 text-xs text-emerald-600 font-medium">
                  Todas las cuotas de este préstamo han sido pagadas.
                </div>
              ) : (
                selectedPrestamoId && (
                  <SelectField
                    label="Cuota a Cobrar"
                    id="cobro-cuota"
                    required
                    value={selectedCuotaId}
                    onChange={(e) => handleCuotaChange(e.target.value)}
                    error={formErrors.cuota}
                  >
                    <option value="">Seleccione cuota...</option>
                    {cuotas.map((c) => (
                      <option key={c.id_cuota} value={c.id_cuota}>
                        Cuota #{c.numero_cuota} — {formatMoney(c.monto)} (Vencimiento: {formatDate(c.fecha_vencimiento)})
                      </option>
                    ))}
                  </SelectField>
                )
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Monto Cobrado (S/)"
                  id="cobro-monto"
                  required
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="50000"
                  maxLength={10}
                  placeholder="0.00"
                  value={montoPagado}
                  onChange={(e) => setMontoPagado(e.target.value)}
                  error={formErrors.monto}
                  disabled={submitting}
                />
                <Field
                  label="Fecha de Cobro"
                  id="cobro-fecha"
                  required
                  type="date"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                  error={formErrors.fecha}
                  disabled={submitting}
                />
              </div>

              <Field
                label="Observación (Opcional)"
                id="cobro-obs"
                maxLength={200}
                placeholder="Ej. Pago en efectivo al mediodía"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                disabled={submitting}
              />
            </>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-border-glass">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedPrestamoId || !selectedCuotaId}
              className="btn btn-primary"
            >
              {submitting ? "Registrando..." : "Confirmar Cobro"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

