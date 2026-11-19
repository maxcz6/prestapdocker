"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, Zap, UserPlus, AlertCircle } from "lucide-react";
import { api, type PrestamoConDetalle } from "@/lib/api-client";
import { useAuth } from "@/components/auth-context";
import { Modal } from "@/components/ui/modal";
import { Field, SelectField } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import type { Cliente } from "@/types/domain";

const formatMoney = (amount?: number | string | null) => {
  if (amount === null || amount === undefined || amount === "") return "S/ 0.00";
  const val = typeof amount === "number" ? amount : parseFloat(String(amount));
  return `S/ ${(isNaN(val) ? 0 : val).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function PrestamosPage() {
  const { user } = useAuth();
  const [prestamos, setPrestamos] = useState<PrestamoConDetalle[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadoFilter, setEstadoFilter] = useState("TODOS");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const canCreate = !!user?.rol && ["ADMIN", "OPERADOR", "SUPERVISOR"].includes(user.rol.toUpperCase());

  // Quick Client Creation Modal State
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientFormData, setClientFormData] = useState({
    dni: "",
    nombres_apellidos: "",
    nombre_negocio: "",
    celular: "",
    direccion_puesto: "",
  });
  const [clientSubmitting, setClientSubmitting] = useState(false);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    id_cliente: "",
    monto: "",
    interes: "20",
    dias: "24",
    fecha_inicio: new Date().toISOString().split("T")[0],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prestamosData, clientesData] = await Promise.all([
        api.prestamos.list(),
        api.clientes.list(),
      ]);
      setPrestamos(prestamosData);
      setClientes(clientesData);
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error al cargar datos", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.prestamos.list(), api.clientes.list()])
      .then(([p, c]) => { if (!cancelled) { setPrestamos(p); setClientes(c); setLoading(false); } })
      .catch((err) => { if (!cancelled) { toast({ title: "Error", description: err instanceof Error ? err.message : "Error al cargar datos", variant: "error" }); setLoading(false); } });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPrestamos = prestamos.filter((p) => {
    const matchEstado = estadoFilter === "TODOS" || p.estado === estadoFilter;
    const term = searchTerm.toLowerCase();
    const matchSearch =
      p.id_prestamo.toLowerCase().includes(term) ||
      (p.cliente?.nombres_apellidos?.toLowerCase().includes(term) ?? false) ||
      (p.cliente?.nombre_negocio?.toLowerCase().includes(term) ?? false) ||
      (p.cliente?.dni?.includes(searchTerm) ?? false);
    return matchEstado && matchSearch;
  });

  // Live calculator
  const calcInfo = useMemo(() => {
    const monto = parseFloat(formData.monto) || 0;
    const interes = parseFloat(formData.interes) || 0;
    const dias = parseInt(formData.dias) || 0;

    const monto_interes = Math.round(monto * (interes / 100) * 100) / 100;
    const total_pagar = Math.round((monto + monto_interes) * 100) / 100;
    const cuota_diaria = dias > 0 ? Math.round((total_pagar / dias) * 100) / 100 : 0;

    let fecha_fin = "";
    if (formData.fecha_inicio && dias > 0) {
      const date = new Date(formData.fecha_inicio + "T00:00:00");
      date.setDate(date.getDate() + (dias - 1));
      fecha_fin = date.toISOString().split("T")[0];
    }

    return { monto_interes, total_pagar, cuota_diaria, fecha_fin };
  }, [formData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.id_cliente) newErrors.id_cliente = "Debe seleccionar un cliente";
    const monto = parseFloat(formData.monto);
    if (isNaN(monto) || monto < 10 || monto > 50000) {
      newErrors.monto = "El monto debe estar entre S/ 10 y S/ 50,000";
    }
    const interes = parseFloat(formData.interes);
    if (isNaN(interes) || interes < 0 || interes > 100) {
      newErrors.interes = "El interés debe estar entre 0% y 100%";
    }
    const dias = parseInt(formData.dias);
    if (isNaN(dias) || dias < 1 || dias > 365) {
      newErrors.dias = "El plazo debe estar entre 1 y 365 días";
    }
    if (!formData.fecha_inicio) newErrors.fecha_inicio = "Seleccione fecha de desembolso";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});

    setSubmitting(true);
    try {
      await api.prestamos.create({
        id_cliente: formData.id_cliente,
        monto,
        interes,
        dias,
        fecha_inicio: formData.fecha_inicio,
      });
      toast({ title: "Éxito", description: "Préstamo y calendario de cuotas creados", variant: "success" });
      setIsModalOpen(false);
      setFormData({ id_cliente: "", monto: "", interes: "20", dias: "24", fecha_inicio: new Date().toISOString().split("T")[0] });
      fetchData();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error al crear préstamo", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Client Submit
  const handleQuickClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dni = clientFormData.dni.trim();
    const nombres = clientFormData.nombres_apellidos.trim();
    const negocio = clientFormData.nombre_negocio.trim();
    const celular = clientFormData.celular.trim();
    const direccion = clientFormData.direccion_puesto.trim();

    const newErrors: Record<string, string> = {};
    if (!/^\d{8}$/.test(dni)) newErrors.dni = "DNI debe tener exactamente 8 dígitos";
    if (nombres.length < 2) newErrors.nombres_apellidos = "Mínimo 2 caracteres";
    else if (nombres.length > 100) newErrors.nombres_apellidos = "Máximo 100 caracteres";
    else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'\-]{2,100}$/.test(nombres)) newErrors.nombres_apellidos = "Solo letras, espacios y acentos";
    if (negocio.length < 2) newErrors.nombre_negocio = "Mínimo 2 caracteres";
    else if (negocio.length > 100) newErrors.nombre_negocio = "Máximo 100 caracteres";
    if (!/^9\d{8}$/.test(celular)) newErrors.celular = "Celular peruano: 9 dígitos, inicia con 9";
    if (direccion.length < 2) newErrors.direccion_puesto = "Mínimo 2 caracteres";
    else if (direccion.length > 60) newErrors.direccion_puesto = "Máximo 60 caracteres";

    if (Object.keys(newErrors).length > 0) {
      setClientErrors(newErrors);
      return;
    }
    setClientErrors({});

    const payload = { dni, nombres_apellidos: nombres, nombre_negocio: negocio, celular, direccion_puesto: direccion };

    setClientSubmitting(true);
    try {
      const created = await api.clientes.create(payload);
      toast({ title: "Cliente Creado", description: `Se registró a ${nombres}`, variant: "success" });
      setIsClientModalOpen(false);
      setClientFormData({ dni: "", nombres_apellidos: "", nombre_negocio: "", celular: "", direccion_puesto: "" });
      
      // Refresh clients list and select newly created client
      const freshClients = await api.clientes.list();
      setClientes(freshClients);
      if (created?.id_cliente) {
        setFormData((prev) => ({ ...prev, id_cliente: created.id_cliente }));
      }
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error al registrar cliente", variant: "error" });
    } finally {
      setClientSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">Gestión de Préstamos</h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">Colocaciones de microcrédito diario y cálculo automático.</p>
        </div>
        {canCreate && (
          <button
            onClick={() => { setIsModalOpen(true); setErrors({}); }}
            className="btn btn-primary"
          >
            + Nuevo Préstamo
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="liquid-glass rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-border-glass flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:max-w-xl">
            <div className="relative flex-1">
              <label htmlFor="search-prestamos" className="sr-only">Buscar préstamo o cliente</label>
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" aria-hidden="true" />
              <input
                id="search-prestamos"
                type="text"
                placeholder="Buscar préstamo o cliente..."
                maxLength={60}
                className="w-full rounded-2xl liquid-glass-input pl-10 pr-4 py-2.5 text-xs sm:text-sm text-text-primary placeholder:text-text-muted"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              aria-label="Filtrar por estado"
              className="rounded-2xl liquid-glass-input px-4 py-2.5 text-xs sm:text-sm text-text-primary"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Activo</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="PAGADO">Pagado</option>
              <option value="VENCIDO">Vencido</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>
          <div className="text-xs text-text-muted font-medium self-end sm:self-center">
            Total: <span className="text-text-primary font-bold">{filteredPrestamos.length}</span> registros
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-text-muted">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <span>Cargando préstamos...</span>
            </div>
          </div>
        ) : filteredPrestamos.length === 0 ? (
          <div className="p-10 text-center text-text-muted text-xs">
            No se encontraron préstamos registrados.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm" role="table">
                <thead>
                  <tr className="border-b border-border-glass bg-bg-card text-text-secondary text-xs uppercase tracking-wider">
                    <th scope="col" className="p-4 pl-6 font-semibold">ID</th>
                    <th scope="col" className="p-4 font-semibold">Cliente</th>
                    <th scope="col" className="p-4 font-semibold">Capital</th>
                    <th scope="col" className="p-4 font-semibold hidden sm:table-cell">Int. %</th>
                    <th scope="col" className="p-4 font-semibold">Total</th>
                    <th scope="col" className="p-4 font-semibold hidden md:table-cell">Plazo</th>
                    <th scope="col" className="p-4 font-semibold hidden md:table-cell">Cuota/día</th>
                    <th scope="col" className="p-4 font-semibold">Estado</th>
                    <th scope="col" className="p-4 font-semibold">Saldo</th>
                    <th scope="col" className="p-4 pr-6 font-semibold text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-glass">
                  {filteredPrestamos.map((p, idx) => (
                    <tr key={p.id_prestamo ? `${p.id_prestamo}-${idx}` : `p-${idx}`} className="hover:bg-bg-hover/80 transition-colors">
                      <td className="p-4 pl-6 font-bold text-primary text-xs">{p.id_prestamo}</td>
                      <td className="p-4 text-text-primary font-medium">{p.cliente?.nombres_apellidos ?? p.id_cliente}</td>
                      <td className="p-4 text-text-primary font-mono text-xs">{formatMoney(p.monto)}</td>
                      <td className="p-4 text-text-secondary hidden sm:table-cell font-mono text-xs">{p.interes}%</td>
                      <td className="p-4 text-text-primary font-semibold font-mono text-xs">{formatMoney(p.total_pagar)}</td>
                      <td className="p-4 text-text-secondary hidden md:table-cell text-xs">{p.dias} días</td>
                      <td className="p-4 text-text-secondary hidden md:table-cell font-mono text-xs">{formatMoney(p.cuota_diaria)}</td>
                      <td className="p-4"><Badge variant={p.estado}>{p.estado}</Badge></td>
                      <td className="p-4 font-bold text-text-primary font-mono text-xs">{formatMoney(p.saldo?.saldo ?? p.total_pagar)}</td>
                      <td className="p-4 pr-6 text-right">
                        <Link
                          href={`/dashboard/prestamos/${p.id_prestamo}`}
                          className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          aria-label={`Ver cuotas de ${p.id_prestamo}`}
                        >
                          Ver Cuotas &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block sm:hidden divide-y divide-border-glass">
              {filteredPrestamos.map((p, idx) => (
                <div key={p.id_prestamo ? `m-pr-${p.id_prestamo}-${idx}` : `m-pr-${idx}`} className="p-4 space-y-3 hover:bg-bg-hover/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary text-xs">{p.id_prestamo}</span>
                        <Badge variant={p.estado}>{p.estado}</Badge>
                      </div>
                      <p className="font-bold text-sm text-text-primary mt-1">{p.cliente?.nombres_apellidos ?? p.id_cliente}</p>
                      <p className="text-xs text-text-muted">{p.cliente?.nombre_negocio || "Negocio independiente"}</p>
                    </div>
                    <Link
                      href={`/dashboard/prestamos/${p.id_prestamo}`}
                      className="rounded-xl px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-all"
                    >
                      Cuotas &rarr;
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-bg-card/50 p-2.5 rounded-xl border border-border-glass">
                    <div>
                      <span className="text-text-muted">Capital:</span>
                      <p className="font-semibold text-text-primary font-mono">{formatMoney(p.monto)} ({p.interes}%)</p>
                    </div>
                    <div>
                      <span className="text-text-muted">Total Deuda:</span>
                      <p className="font-semibold text-text-primary font-mono">{formatMoney(p.total_pagar)}</p>
                    </div>
                    <div>
                      <span className="text-text-muted">Saldo Pendiente:</span>
                      <p className="font-bold text-rose-600 dark:text-rose-400 font-mono">{formatMoney(p.saldo?.saldo ?? p.total_pagar)}</p>
                    </div>
                    <div>
                      <span className="text-text-muted">Cuota Diaria:</span>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{formatMoney(p.cuota_diaria)}/día</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create Modal with Live Glass Calculator */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo Préstamo" maxWidth="max-w-xl">
        <form onSubmit={handleCreate} className="space-y-4" noValidate>
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-semibold text-text-primary">
                Selección de Cliente
              </span>
              <button
                type="button"
                onClick={() => {
                  setClientErrors({});
                  setClientFormData({ dni: "", nombres_apellidos: "", nombre_negocio: "", celular: "", direccion_puesto: "" });
                  setIsClientModalOpen(true);
                }}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold cursor-pointer"
              >
                <UserPlus className="h-3 w-3" />
                + Registrar nuevo cliente
              </button>
            </div>

            {clientes.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-700 dark:text-amber-300 flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>No hay clientes registrados en el sistema. Registra uno para continuar.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setClientErrors({});
                    setClientFormData({ dni: "", nombres_apellidos: "", nombre_negocio: "", celular: "", direccion_puesto: "" });
                    setIsClientModalOpen(true);
                  }}
                  className="rounded-lg px-2.5 py-1 bg-amber-600 text-white font-semibold shrink-0 hover:bg-amber-700 text-[11px]"
                >
                  Crear Cliente
                </button>
              </div>
            ) : (
              <SelectField
                label="Cliente / Comerciante"
                id="prestamo-cliente"
                required
                value={formData.id_cliente}
                onChange={(e) => setFormData({ ...formData, id_cliente: e.target.value })}
                disabled={submitting}
                error={errors.id_cliente}
              >
                <option value="">Seleccione un comerciante / cliente</option>
                {clientes.map((c) => (
                  <option key={c.id_cliente} value={c.id_cliente}>
                    {c.nombres_apellidos} — DNI: {c.dni} ({c.nombre_negocio})
                  </option>
                ))}
              </SelectField>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Capital a Prestar (S/)"
              id="prestamo-monto"
              required
              type="number"
              step="0.01"
              min="1"
              max="50000"
              maxLength={10}
              placeholder="Ej. 1000"
              value={formData.monto}
              onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
              disabled={submitting}
              error={errors.monto}
            />
            <Field
              label="Interés (%)"
              id="prestamo-interes"
              required
              type="number"
              step="0.01"
              min="0"
              max="100"
              maxLength={5}
              placeholder="Ej. 20"
              value={formData.interes}
              onChange={(e) => setFormData({ ...formData, interes: e.target.value })}
              disabled={submitting}
              error={errors.interes}
            />
            <Field
              label="Número de Días / Cuotas"
              id="prestamo-dias"
              required
              type="number"
              min="1"
              max="365"
              maxLength={3}
              placeholder="Ej. 24"
              value={formData.dias}
              onChange={(e) => setFormData({ ...formData, dias: e.target.value })}
              disabled={submitting}
              error={errors.dias}
            />
            <Field
              label="Fecha de Desembolso"
              id="prestamo-fecha"
              required
              type="date"
              value={formData.fecha_inicio}
              onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
              disabled={submitting}
              error={errors.fecha_inicio}
            />
          </div>

          {/* Live Liquid Glass Calculator Preview */}
          <div className="rounded-2xl liquid-glass p-4 space-y-2 border border-primary/25 shadow-inner text-xs sm:text-sm">
            <div className="flex items-center gap-2 font-bold text-primary mb-1">
              <Zap className="h-4 w-4" aria-hidden="true" /> Simulador de Cuotas en Tiempo Real
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border-glass">
              <div>
                <span className="text-text-secondary">Interés Calculado:</span>
                <p className="font-bold text-text-primary">{formatMoney(calcInfo.monto_interes)}</p>
              </div>
              <div>
                <span className="text-text-secondary">Total a Devolver:</span>
                <p className="font-extrabold text-primary text-base">{formatMoney(calcInfo.total_pagar)}</p>
              </div>
              <div>
                <span className="text-text-secondary">Cuota Diaria:</span>
                <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(calcInfo.cuota_diaria)} / día</p>
              </div>
              <div>
                <span className="text-text-secondary">Fecha Último Cobro:</span>
                <p className="font-medium text-text-primary">{calcInfo.fecha_fin || "—"}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-glass">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={submitting || !formData.id_cliente} className="btn btn-primary">
              {submitting ? "Creando Préstamo..." : "Confirmar y Generar Cuotas"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Submodal: Registrar Cliente Rápido */}
      <Modal open={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} title="Registrar Cliente Nuevo">
        <form onSubmit={handleQuickClientSubmit} className="space-y-4" noValidate>
          <Field
            label="DNI"
            id="quick-dni"
            required
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            minLength={8}
            maxLength={8}
            placeholder="Ej. 12345678"
            value={clientFormData.dni}
            onChange={(e) => setClientFormData({ ...clientFormData, dni: e.target.value })}
            disabled={clientSubmitting}
            error={clientErrors.dni}
            hint="8 dígitos (DNI peruano)"
          />
          <Field
            label="Nombres y Apellidos"
            id="quick-nombre"
            required
            type="text"
            minLength={2}
            maxLength={100}
            placeholder="Ej. María Elena Flores"
            value={clientFormData.nombres_apellidos}
            onChange={(e) => setClientFormData({ ...clientFormData, nombres_apellidos: e.target.value.slice(0, 100) })}
            disabled={clientSubmitting}
            error={clientErrors.nombres_apellidos}
            hint="2 a 100 caracteres, solo letras"
          />
          <Field
            label="Nombre del Negocio"
            id="quick-negocio"
            required
            type="text"
            minLength={2}
            maxLength={100}
            placeholder="Ej. Bodega San Martín"
            value={clientFormData.nombre_negocio}
            onChange={(e) => setClientFormData({ ...clientFormData, nombre_negocio: e.target.value.slice(0, 100) })}
            disabled={clientSubmitting}
            error={clientErrors.nombre_negocio}
            hint="2 a 100 caracteres"
          />
          <Field
            label="Celular"
            id="quick-celular"
            required
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            minLength={9}
            maxLength={9}
            placeholder="Ej. 987654321"
            value={clientFormData.celular}
            onChange={(e) => setClientFormData({ ...clientFormData, celular: e.target.value })}
            disabled={clientSubmitting}
            error={clientErrors.celular}
            hint="9 dígitos, inicia con 9 (Perú)"
          />
          {/* La dirección del cliente es obligatoria y se limita a 2-60 caracteres, igual que en Clientes. */}
          <Field
            label="Dirección / Puesto"
            id="quick-direccion"
            required
            type="text"
            minLength={2}
            maxLength={60}
            placeholder="Ej. Puesto 14, Mercado Central"
            value={clientFormData.direccion_puesto}
            onChange={(e) => setClientFormData({ ...clientFormData, direccion_puesto: e.target.value.slice(0, 60) })}
            disabled={clientSubmitting}
            error={clientErrors.direccion_puesto}
            hint="2 a 60 caracteres"
          />
          <div className="flex justify-end gap-2 pt-4 border-t border-border-glass">
            <button type="button" onClick={() => setIsClientModalOpen(false)} className="btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={clientSubmitting} className="btn btn-primary">
              {clientSubmitting ? "Guardando..." : "Guardar y Asignar al Préstamo"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
