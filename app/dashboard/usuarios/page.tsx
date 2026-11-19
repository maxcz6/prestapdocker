"use client";

import { useState, useEffect, useCallback } from "react";
import { UserPlus, Shield, ShieldAlert, Edit2, Trash2, Search, CheckCircle2, XCircle } from "lucide-react";
import { api, type UsuarioItem } from "@/lib/api-client";
import { useAuth } from "@/components/auth-context";
import { Modal } from "@/components/ui/modal";
import { Field, SelectField } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

const ROLES = [
  { value: "ADMIN", label: "Administrador (Acceso Total)", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  { value: "SUPERVISOR", label: "Supervisor (Gestión y Reportes)", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  { value: "OPERADOR", label: "Operador (Gestión de Cartera)", color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" },
  { value: "COBRADOR", label: "Cobrador (Solo Registro de Pagos)", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
];

export default function UsuariosPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UsuarioItem | null>(null);
  const [userToDelete, setUserToDelete] = useState<UsuarioItem | null>(null);

  // Formularios
  const [createForm, setCreateForm] = useState({
    usuario: "",
    correo: "",
    password: "",
    rol: "COBRADOR",
    estado: "ACTIVO",
  });

  const [editForm, setEditForm] = useState({
    usuario: "",
    correo: "",
    password: "",
    rol: "COBRADOR",
    estado: "ACTIVO",
  });

  const fetchUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.usuarios.list();
      setUsuarios(data);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Error al cargar usuarios",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let ignore = false;
    if (user?.rol === "ADMIN") {
      api.usuarios.list()
        .then((data) => {
          if (!ignore) {
            setUsuarios(data);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (!ignore) {
            toast({
              title: "Error",
              description: err instanceof Error ? err.message : "Error al cargar usuarios",
              variant: "error",
            });
            setLoading(false);
          }
        });
    }

    return () => {
      ignore = true;
    };
  }, [user, toast]);

  if (user?.rol !== "ADMIN") {
    return (
      <div className="liquid-glass rounded-2xl border border-rose-500/30 p-12 text-center bg-rose-500/10 max-w-2xl mx-auto mt-10">
        <ShieldAlert className="h-12 w-12 mx-auto mb-3 text-rose-500" aria-hidden="true" />
        <h2 className="text-xl font-bold text-text-primary">Acceso Restringido</h2>
        <p className="text-sm text-text-secondary mt-2">
          Este módulo está reservado exclusivamente para Administradores del sistema. Tu rol actual es <span className="font-bold text-rose-600 dark:text-rose-400">{user?.rol || "Desconocido"}</span>.
        </p>
      </div>
    );
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!createForm.usuario.trim()) newErrors.usuario = "Requerido";
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(createForm.usuario)) newErrors.usuario = "Solo letras, números y guión bajo (3-30)";
    if (!createForm.correo.trim()) newErrors.correo = "Requerido";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.correo)) newErrors.correo = "Correo inválido";
    if (createForm.password.length < 8) newErrors.password = "Mínimo 8 caracteres";
    if (createForm.password.length > 128) newErrors.password = "Máximo 128 caracteres";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    setSubmitting(true);
    try {
      await api.usuarios.create(createForm);
      toast({ title: "Éxito", description: `Usuario @${createForm.usuario} creado con éxito`, variant: "success" });
      setIsCreateOpen(false);
      setCreateForm({ usuario: "", correo: "", password: "", rol: "COBRADOR", estado: "ACTIVO" });
      fetchUsuarios();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error al crear usuario", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditOpen = (u: UsuarioItem) => {
    setSelectedUser(u);
    setEditForm({
      usuario: u.usuario,
      correo: u.correo,
      password: "",
      rol: u.rol,
      estado: u.estado,
    });
    setIsEditOpen(true);
    setErrors({});
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const newErrors: Record<string, string> = {};
    if (!editForm.usuario.trim()) newErrors.usuario = "Requerido";
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(editForm.usuario)) newErrors.usuario = "Solo letras, números y guión bajo (3-30)";
    if (!editForm.correo.trim()) newErrors.correo = "Requerido";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.correo)) newErrors.correo = "Correo inválido";
    if (editForm.password && (editForm.password.length < 8 || editForm.password.length > 128)) newErrors.password = "Entre 8 y 128 caracteres";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    setSubmitting(true);
    try {
      const payload: { id_usuario: string; usuario?: string; correo?: string; password?: string; rol?: string; estado?: string } = {
        id_usuario: selectedUser.id_usuario,
        usuario: editForm.usuario,
        correo: editForm.correo,
        rol: editForm.rol,
        estado: editForm.estado,
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      await api.usuarios.update(payload);
      toast({ title: "Actualizado", description: `Usuario @${editForm.usuario} modificado`, variant: "success" });
      setIsEditOpen(false);
      fetchUsuarios();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error al actualizar usuario", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };


  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await api.usuarios.delete(userToDelete.id_usuario);
      toast({ title: "Eliminado", description: `Usuario @${userToDelete.usuario} eliminado`, variant: "success" });
      fetchUsuarios();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error al eliminar usuario", variant: "error" });
    } finally {
      setUserToDelete(null);
    }
  };

  const handleDelete = async (u: UsuarioItem) => {
    if (u.id_usuario === user?.id_usuario) {
      toast({ title: "Acción no permitida", description: "No puedes eliminar tu propia cuenta en sesión", variant: "error" });
      return;
    }
    setUserToDelete(u);
  };


  const filteredUsuarios = usuarios.filter((u) => {
    const q = search.toLowerCase();
    return u.usuario.toLowerCase().includes(q) || u.correo.toLowerCase().includes(q) || u.rol.toLowerCase().includes(q);
  });

  const getRoleBadge = (rol: string) => {
    const r = ROLES.find((item) => item.value === rol.toUpperCase());
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${r?.color || "bg-slate-500/10 text-slate-500"}`}>
        <Shield className="h-3 w-3" />
        {rol.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">Gestión de Usuarios y Roles</h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">Crea accesos seguros y asigna permisos específicos por rol.</p>
        </div>
        <button
          onClick={() => { setIsCreateOpen(true); setErrors({}); }}
          className="btn btn-primary"
        >
          <UserPlus className="h-4 w-4" />
          + Nuevo Usuario
        </button>
      </div>

      {/* Buscador y Resumen */}
      <div className="liquid-glass rounded-2xl p-4 flex flex-col sm:flex-row justify-between gap-4 items-center">
        <div className="relative w-full sm:w-80">
          <label htmlFor="search-usuarios" className="sr-only">Buscar por usuario o correo</label>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            id="search-usuarios"
            type="text"
            placeholder="Buscar por usuario o correo..."
            maxLength={50}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl liquid-glass-input text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
        </div>
        <div className="text-xs text-text-muted font-medium self-end sm:self-center">
          Total: <span className="font-bold text-text-primary">{usuarios.length}</span> usuarios ({usuarios.filter(u => u.estado === "ACTIVO").length} activos)
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="liquid-glass rounded-2xl overflow-hidden border border-border-glass">
        {loading ? (
          <div className="p-12 text-center text-sm text-text-muted">Cargando usuarios...</div>
        ) : filteredUsuarios.length === 0 ? (
          <div className="p-12 text-center text-sm text-text-muted">No se encontraron usuarios registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-hover/50 text-xs text-text-secondary uppercase border-b border-border-glass">
                <tr>
                  <th className="px-6 py-4 font-semibold">Usuario</th>
                  <th className="px-6 py-4 font-semibold">Correo Electrónico</th>
                  <th className="px-6 py-4 font-semibold">Rol / Permisos</th>
                  <th className="px-6 py-4 font-semibold">Estado</th>
                  <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-glass">
                {filteredUsuarios.map((u) => (
                  <tr key={u.id_usuario} className="hover:bg-bg-hover/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-text-primary">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {u.usuario.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary">@{u.usuario}</p>
                          <p className="text-[11px] text-text-muted font-mono">{u.id_usuario}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-secondary">{u.correo}</td>
                    <td className="px-6 py-4">{getRoleBadge(u.rol)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        u.estado === "ACTIVO"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                      }`}>
                        {u.estado === "ACTIVO" ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {u.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditOpen(u)}
                          className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                          title="Editar Usuario"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={u.id_usuario === user?.id_usuario}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.id_usuario === user?.id_usuario
                              ? "text-text-muted/40 cursor-not-allowed"
                              : "text-rose-500 hover:bg-rose-500/10"
                          }`}
                          title={u.id_usuario === user?.id_usuario ? "No puedes eliminar tu cuenta" : "Eliminar Usuario"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar Usuario"
        description={`¿Estás seguro de eliminar permanentemente al usuario @${userToDelete?.usuario}?`}
        confirmLabel="Eliminar"
      />

      {/* Modal Crear Usuario */}
      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Crear Nuevo Usuario">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Field
            id="create-usuario"
            label="Nombre de Usuario (Login)"
            required
            maxLength={30}
            placeholder="ej. cobrador_juan"
            value={createForm.usuario}
            onChange={(e) => setCreateForm({ ...createForm, usuario: e.target.value })}
            error={errors.usuario}
            autoComplete="off"
            hint="Solo letras, números y guión bajo"
          />

          <Field
            id="create-correo"
            label="Correo Electrónico"
            type="email"
            required
            maxLength={100}
            placeholder="juan@prestap.com"
            value={createForm.correo}
            onChange={(e) => setCreateForm({ ...createForm, correo: e.target.value })}
            error={errors.correo}
            autoComplete="off"
          />

          <Field
            id="create-password"
            label="Contraseña Inicial"
            type="password"
            required
            maxLength={128}
            placeholder="Mínimo 8 caracteres (se cifrará con scrypt)"
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            error={errors.password}
            autoComplete="new-password"
            hint="Mínimo 8 caracteres, mezcla letras y números"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField
              id="create-rol"
              label="Rol / Permisos"
              value={createForm.rol}
              onChange={(e) => setCreateForm({ ...createForm, rol: e.target.value })}
            >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value} className="bg-bg-card text-text-primary">
                    {r.value}
                  </option>
                ))}
              </SelectField>

            <SelectField
              id="create-estado"
              label="Estado"
              value={createForm.estado}
              onChange={(e) => setCreateForm({ ...createForm, estado: e.target.value })}
            >
                <option value="ACTIVO" className="bg-bg-card text-text-primary">ACTIVO</option>
                <option value="INACTIVO" className="bg-bg-card text-text-primary">INACTIVO</option>
              </SelectField>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={() => setIsCreateOpen(false)} className="btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? "Creando..." : "Guardar Usuario"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Usuario */}
      <Modal open={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Editar Usuario @${selectedUser?.usuario}`}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Field
            id="edit-usuario"
            label="Nombre de Usuario"
            required
            maxLength={30}
            value={editForm.usuario}
            onChange={(e) => setEditForm({ ...editForm, usuario: e.target.value })}
            error={errors.usuario}
            hint="Solo letras, números y guión bajo"
          />

          <Field
            id="edit-correo"
            label="Correo Electrónico"
            type="email"
            required
            maxLength={100}
            value={editForm.correo}
            onChange={(e) => setEditForm({ ...editForm, correo: e.target.value })}
            error={errors.correo}
          />

          <Field
            id="edit-password"
            label="Nueva Contraseña"
            hint="(Opcional, dejar vacío si no cambia. Mínimo 8 caracteres)"
            type="password"
            maxLength={128}
            placeholder="Escribe para cambiar la contraseña..."
            value={editForm.password}
            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
            error={errors.password}
            autoComplete="new-password"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField
              id="edit-rol"
              label="Rol / Permisos"
              value={editForm.rol}
              onChange={(e) => setEditForm({ ...editForm, rol: e.target.value })}
            >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value} className="bg-bg-card text-text-primary">
                    {r.value}
                  </option>
                ))}
              </SelectField>

            <SelectField
              id="edit-estado"
              label="Estado"
              value={editForm.estado}
              onChange={(e) => setEditForm({ ...editForm, estado: e.target.value })}
            >
                <option value="ACTIVO" className="bg-bg-card text-text-primary">ACTIVO</option>
                <option value="INACTIVO" className="bg-bg-card text-text-primary">INACTIVO</option>
              </SelectField>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={() => setIsEditOpen(false)} className="btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? "Guardando..." : "Actualizar"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
