"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/auth-context";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import type { Cliente } from "@/types/domain";

const initialForm = {
  dni: "",
  nombres_apellidos: "",
  nombre_negocio: "",
  celular: "",
  direccion_puesto: "",
};

type ClienteFormData = typeof initialForm;

function normalizeSpaces(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function sanitizeNames(value: string) {
  return value.replace(/[^\p{L}\p{M} ]/gu, "").slice(0, 100);
}

function sanitizeBusinessName(value: string) {
  return value.replace(/[^\p{L}\p{M} '-]/gu, "").slice(0, 100);
}

function preventNumericKey(event: React.KeyboardEvent<HTMLInputElement>) {
  if (/[0-9]/.test(event.key)) event.preventDefault();
}

function normalizeClienteForm(form: ClienteFormData): ClienteFormData {
  return {
    dni: form.dni.trim(),
    nombres_apellidos: normalizeSpaces(form.nombres_apellidos),
    nombre_negocio: normalizeSpaces(form.nombre_negocio),
    celular: form.celular.trim(),
    direccion_puesto: normalizeSpaces(form.direccion_puesto),
  };
}

function validateClienteForm(form: ClienteFormData): Partial<Record<keyof ClienteFormData, string>> {
  const errors: Partial<Record<keyof ClienteFormData, string>> = {};

  if (!/^\d{8}$/.test(form.dni)) errors.dni = "DNI debe tener exactamente 8 dígitos";

  if (form.nombres_apellidos.length < 2) errors.nombres_apellidos = "Mínimo 2 caracteres";
  else if (form.nombres_apellidos.length > 100) errors.nombres_apellidos = "Máximo 100 caracteres";
  else if (!/^[\p{L}\p{M} ]+$/u.test(form.nombres_apellidos)) {
    errors.nombres_apellidos = "Solo se permiten letras y espacios";
  }

  if (form.nombre_negocio.length < 2) errors.nombre_negocio = "Mínimo 2 caracteres";
  else if (form.nombre_negocio.length > 100) errors.nombre_negocio = "Máximo 100 caracteres";
  else if (!/^[\p{L}\p{M} '-]+$/u.test(form.nombre_negocio)) {
    errors.nombre_negocio = "Solo se permiten letras, espacios, apóstrofos y guiones";
  }

  if (!/^9\d{8}$/.test(form.celular)) {
    errors.celular = "Celular peruano: 9 dígitos, inicia con 9";
  }

  if (form.direccion_puesto.length < 2) errors.direccion_puesto = "Mínimo 2 caracteres";
  else if (form.direccion_puesto.length > 60) errors.direccion_puesto = "Máximo 60 caracteres";
  else if (!/^[\p{L}\p{M}0-9 .,#'°/()-]+$/u.test(form.direccion_puesto)) {
    errors.direccion_puesto = "La dirección contiene caracteres no permitidos";
  }

  return errors;
}

export default function ClientesPage() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentCliente, setCurrentCliente] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ClienteFormData, string>>>({});
  const [monitoringAlert, setMonitoringAlert] = useState<string | null>(null);
  const failedSaveTimestamps = useRef<number[]>([]);

  const { toast } = useToast();

  const canCreateOrEdit = !!user?.rol && ["ADMIN", "OPERADOR", "SUPERVISOR"].includes(user.rol);
  const canDelete = user?.rol === "ADMIN";
  const hasActions = canCreateOrEdit || canDelete;

  const fetchClientes = useCallback(async () => {
    try {
      const data = await api.clientes.list();
      setClientes(data);
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "No se pudo cargar clientes", variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    api.clientes.list()
      .then((data) => {
        if (!cancelled) setClientes(data);
      })
      .catch((err) => {
        if (!cancelled) {
          toast({ title: "Error", description: err instanceof Error ? err.message : "No se pudo cargar clientes", variant: "error" });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [toast]);

  const filteredClientes = clientes.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      (c.nombres_apellidos ?? "").toLowerCase().includes(term) ||
      (c.dni ?? "").includes(searchTerm) ||
      (c.nombre_negocio ?? "").toLowerCase().includes(term)
    );
  });

  const openCreateModal = () => {
    setCurrentCliente(null);
    setErrors({});
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const openEditModal = (cliente: Cliente) => {
    setCurrentCliente(cliente);
    setErrors({});
    setFormData({
      dni: cliente.dni,
      nombres_apellidos: cliente.nombres_apellidos,
      nombre_negocio: cliente.nombre_negocio,
      celular: cliente.celular,
      direccion_puesto: cliente.direccion_puesto,
    });
    setIsModalOpen(true);
  };

  const openDeleteModal = (cliente: Cliente) => {
    setCurrentCliente(cliente);
    setIsDeleteModalOpen(true);
  };

  // ============================================================================
  // TEMA 3: Validación y Sanitización en el Navegador (Frontend)
  // ============================================================================
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedForm = normalizeClienteForm(formData);
    const validationErrors = validateClienteForm(normalizedForm);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    setSubmitting(true);
    const startedAt = Date.now();
    try {
      if (currentCliente) {
        await api.clientes.update({ id_cliente: currentCliente.id_cliente, ...normalizedForm });
        toast({ title: "Éxito", description: "Cliente actualizado correctamente", variant: "success" });
      } else {
        await api.clientes.create(normalizedForm);
        toast({ title: "Éxito", description: "Cliente registrado con éxito", variant: "success" });
      }
      if (Date.now() - startedAt > 5000) {
        setMonitoringAlert("La operación de registro o actualización tardó más de 5 segundos en responder.");
      }
      setIsModalOpen(false);
      setLoading(true);
      void fetchClientes();
    } catch (err) {
      const now = Date.now();
      const recentFailures = [...failedSaveTimestamps.current.filter((timestamp) => now - timestamp < 5 * 60 * 1000), now];
      failedSaveTimestamps.current = recentFailures;
      const requestDuration = now - startedAt;

      if (recentFailures.length >= 5 || requestDuration > 5000) {
        setIsModalOpen(false);
        setMonitoringAlert(
          recentFailures.length >= 5
            ? "Se detectaron 5 fallos al registrar o actualizar clientes durante los últimos 5 minutos."
            : "La operación de registro o actualización tardó más de 5 segundos en responder.",
        );
      }
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error al guardar cliente", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!currentCliente) return;
    setSubmitting(true);
    try {
      await api.clientes.delete(currentCliente.id_cliente);
      toast({ title: "Éxito", description: "Cliente eliminado", variant: "success" });
      setIsDeleteModalOpen(false);
      setLoading(true);
      void fetchClientes();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error al eliminar", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">Directorio de Clientes</h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">Administra comerciantes, negocios y contactos registrados.</p>
        </div>
        {canCreateOrEdit && (
          <button
            onClick={openCreateModal}
            className="btn btn-primary"
          >
            + Nuevo Cliente
          </button>
        )}
      </div>

      {/* Requisito ágil (ISO 12207): describe la funcionalidad desde la perspectiva del usuario. */}
      <section className="liquid-glass rounded-2xl p-5 shadow-xl" aria-labelledby="registro-cliente-requirements">
        <div className="mb-4">
          <h2 id="registro-cliente-requirements" className="text-lg font-bold text-text-primary">
            Funcionalidad: Registrar un cliente
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Historia de usuario: Como operador del sistema, quiero registrar los datos de un cliente y su negocio,
            para mantener actualizado el directorio y poder identificarlo en sus operaciones.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Verificación y validación (ISO 12207): criterios que confirman que la funcionalidad está hecha. */}
          <article className="rounded-xl border border-border-glass bg-bg-card/50 p-4">
            <h3 className="text-sm font-bold text-text-primary">Criterios de aceptación</h3>
            <ul className="mt-2 list-disc space-y-2 pl-4 text-xs text-text-secondary">
              <li>Con datos válidos, el cliente se guarda y aparece en el directorio.</li>
              <li>Con datos inválidos o incompletos, se muestran errores y no se envía el formulario.</li>
            </ul>
          </article>

          {/* Operación y DevOps (ISO 12207): evento que debe activar una alerta en producción. */}
          <article className="rounded-xl border border-border-glass bg-bg-card/50 p-4">
            <h3 className="text-sm font-bold text-text-primary">Monitoreo y alerta</h3>
            <p className="mt-2 text-xs text-text-secondary">
              Generar una alerta si el registro de un cliente falla cinco veces en cinco minutos o si la API tarda
              más de 5 segundos en responder.
            </p>
          </article>

          {/* Referencia rápida: conecta cada parte documentada con la acción disponible en esta pantalla. */}
          <article className="rounded-xl border border-border-glass bg-bg-card/50 p-4">
            <h3 className="text-sm font-bold text-text-primary">Acción disponible</h3>
            <p className="mt-2 text-xs text-text-secondary">
              Usa “+ Nuevo Cliente” para ejecutar el registro. El formulario valida DNI, nombres, negocio, celular y
              dirección antes de guardar.
            </p>
          </article>
        </div>
      </section>

      {/* Glass Card Table */}
      <div className="liquid-glass rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-border-glass flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="w-full sm:max-w-md">
            <label htmlFor="search-clientes" className="sr-only">Buscar clientes</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" aria-hidden="true" />
              <input
                id="search-clientes"
                type="text"
                placeholder="Buscar por nombre, DNI o negocio..."
                maxLength={60}
                className="w-full rounded-2xl liquid-glass-input pl-10 pr-4 py-2.5 text-xs sm:text-sm text-text-primary placeholder:text-text-muted"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="text-xs text-text-muted font-medium self-end sm:self-center">
            Total: <span className="text-text-primary font-bold">{filteredClientes.length}</span> clientes
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" role="table">
            <thead>
              <tr className="border-b border-border-glass bg-bg-card text-text-secondary text-xs uppercase tracking-wider">
                <th scope="col" className="p-4 pl-6 font-semibold">ID</th>
                <th scope="col" className="p-4 font-semibold">DNI</th>
                <th scope="col" className="p-4 font-semibold">Nombre y Apellidos</th>
                <th scope="col" className="p-4 font-semibold">Negocio</th>
                <th scope="col" className="p-4 font-semibold">Celular</th>
                <th scope="col" className="p-4 font-semibold hidden md:table-cell">Dirección / Puesto</th>
                {hasActions && <th scope="col" className="p-4 pr-6 font-semibold text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-glass">
              {loading ? (
                <tr>
                  <td colSpan={hasActions ? 7 : 6} className="p-10 text-center text-text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                      <span>Cargando clientes...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredClientes.length === 0 ? (
                <tr>
                  <td colSpan={hasActions ? 7 : 6} className="p-10 text-center text-text-muted">
                    No se encontraron clientes registrados.
                  </td>
                </tr>
              ) : (
                filteredClientes.map((cliente, idx) => (
                  <tr key={cliente.id_cliente ? `${cliente.id_cliente}-${idx}` : `c-${idx}`} className="hover:bg-bg-hover/80 transition-colors">
                    <td className="p-4 pl-6 font-bold text-primary text-xs">{cliente.id_cliente}</td>
                    <td className="p-4 text-text-primary font-mono text-xs">{cliente.dni}</td>
                    <td className="p-4 text-text-primary font-medium">{cliente.nombres_apellidos}</td>
                    <td className="p-4 text-text-secondary">{cliente.nombre_negocio}</td>
                    <td className="p-4 text-text-primary font-mono text-xs">{cliente.celular}</td>
                    <td className="p-4 text-text-secondary hidden md:table-cell text-xs">{cliente.direccion_puesto}</td>
                    {hasActions && (
                      <td className="p-4 pr-6 text-right space-x-2">
                        {canCreateOrEdit && (
                          <button
                            onClick={() => openEditModal(cliente)}
                            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
                            aria-label={`Editar ${cliente.nombres_apellidos}`}
                          >
                            Editar
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => openDeleteModal(cliente)}
                            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 transition-all"
                            aria-label={`Eliminar ${cliente.nombres_apellidos}`}
                          >
                            Eliminar
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentCliente ? "Editar Cliente" : "Nuevo Cliente"}>
        {/* noValidate deja que handleSave muestre los errores propios del formulario. */}
        <form onSubmit={handleSave} className="space-y-4" noValidate>
          {/* El DNI se limita a ocho caracteres y solo se acepta si todos son dígitos. */}
          <Field
            label="DNI"
            id="form-dni"
            required
            type="text"
            inputMode="numeric" // restringe el teclado virtual a dígitos en móviles, pero no impide pegar texto.
            pattern="[0-9]*"
            minLength={8}
            maxLength={8}
            placeholder="Ej. 12345678"
            value={formData.dni}
            onChange={(e) => setFormData({ ...formData, dni: e.target.value.slice(0, 8) })}
            disabled={submitting}
            error={errors.dni}
            hint="8 dígitos (DNI peruano)"
          />
          {/* Los nombres admiten únicamente letras y espacios, entre 2 y 100 caracteres. */}
          <Field
            label="Nombres y Apellidos"
            id="form-nombre"
            required
            type="text"
            inputMode="text"
            minLength={2}
            maxLength={100}
            placeholder="Ej. María Elena Flores"
            value={formData.nombres_apellidos}
            onKeyDown={preventNumericKey}
            onChange={(e) => {
              setFormData((current) => ({
                ...current,
                nombres_apellidos: sanitizeNames(e.target.value),
              }));
            }}
            disabled={submitting}
            error={errors.nombres_apellidos}
            hint="2 a 100 caracteres, solo letras"
          />
          {/* El negocio permite letras, espacios, apóstrofos y guiones; no permite números. */}
          <Field
            label="Nombre del Negocio"
            id="form-negocio"
            required
            type="text"
            inputMode="text"
            minLength={2}
            maxLength={100}
            placeholder="Ej. Bodega San Martín"
            value={formData.nombre_negocio}
            onKeyDown={preventNumericKey}
            onChange={(e) => {
              setFormData((current) => ({
                ...current,
                nombre_negocio: sanitizeBusinessName(e.target.value),
              }));
            }}
            disabled={submitting}
            error={errors.nombre_negocio}
            hint="2 a 100 caracteres, sin números"
          />
          {/* El celular se limita a nueve dígitos; handleSave valida que comience con 9. */}
          <Field
            label="Celular"
            id="form-celular"
            required
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            minLength={9}
            maxLength={9}
            placeholder="Ej. 987654321"
            value={formData.celular}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
              // Solo permite conservar el celular si el primer dígito es 9.
              setFormData({ ...formData, celular: digits === "" || digits.startsWith("9") ? digits : "" });
            }}
            disabled={submitting}
            error={errors.celular}
            hint="9 dígitos, inicia con 9 (Perú)"
          />
          {/* La dirección es obligatoria, admite texto/números y debe tener entre 2 y 60 caracteres. */}
          <Field
            label="Dirección / Puesto"
            id="form-direccion"
            required
            type="text"
            minLength={2}
            maxLength={60}
            placeholder="Ej. Puesto 14, Mercado Central"
            value={formData.direccion_puesto}
            onChange={(e) => setFormData({ ...formData, direccion_puesto: e.target.value.slice(0, 60) })}
            disabled={submitting}
            error={errors.direccion_puesto}
            hint="2 a 60 caracteres"
          />
          <div className="flex justify-end gap-2 pt-4 border-t border-border-glass">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? "Guardando..." : "Guardar Cliente"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Operación / DevOps: alerta automática visible cuando se cumple el umbral de monitoreo. */}
      <Modal
        open={monitoringAlert !== null}
        onClose={() => setMonitoringAlert(null)}
        title="Alerta de monitoreo"
        description="Operación / DevOps — Registro de clientes"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">{monitoringAlert}</p>
          <p className="text-xs text-text-muted">
            El evento requiere revisión del equipo responsable en producción.
          </p>
          <div className="flex justify-end border-t border-border-glass pt-4">
            <button type="button" onClick={() => setMonitoringAlert(null)} className="btn btn-primary">
              Entendido
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <ConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Cliente"
        description={`¿Confirmas la eliminación del cliente ${currentCliente?.nombres_apellidos}? No se puede eliminar si tiene préstamos activos.`}
        confirmLabel="Eliminar Definitivamente"
        loading={submitting}
      />
    </div>
  );
}