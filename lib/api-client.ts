import type { Cliente, Prestamo, Cuota, Pago } from "@/types/domain";

// ---------- Types ----------

export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = { success: false; error: string; details?: unknown };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type DashboardData = {
  clientes: number;
  prestamos: number;
  prestado: number;
  total_cartera: number;
  cobrado: number;
  saldo: number;
  cuotas_vencidas: number;
  monto_vencido: number;
  morosos: number;
};

export type PrestamoConDetalle = Prestamo & {
  cliente?: Cliente;
  saldo?: { total: number; pagado: number; saldo: number };
};

export type PagoConDetalle = Pago & {
  cliente?: Cliente;
  prestamo?: Prestamo;
  cuota?: Cuota;
};

export type ReportePrestamo = {
  id_prestamo: string;
  cliente: string;
  negocio: string;
  monto: number;
  interes: number;
  monto_interes: number;
  total: number;
  pagado: number;
  saldo: number;
  estado: string;
};

export type ReportePago = {
  fecha: string;
  cliente: string;
  negocio: string;
  prestamo: string;
  cuota: number;
  monto: number;
  observacion: string;
};

export type ReporteMoroso = {
  cliente: string;
  telefono: string;
  negocio: string;
  prestamo: string;
  cuotas_vencidas: number;
  monto_vencido: number;
  saldo: number;
};

export type SessionData = {
  authenticated: boolean;
  session?: { id_usuario: string; usuario: string; rol: string };
};

export type LoginResult = {
  id_usuario: string;
  usuario: string;
  correo: string;
  rol: string;
};

export type CrearPrestamoResult = {
  prestamo: Prestamo;
  cuotas: Cuota[];
};

export type CrearPagoResult = {
  pago: Pago;
  cuota: Cuota;
  estadoPrestamo: string;
};

export type UsuarioItem = {
  id_usuario: string;
  usuario: string;
  correo: string;
  rol: "ADMIN" | "OPERADOR" | "SUPERVISOR" | "COBRADOR" | string;
  estado: "ACTIVO" | "INACTIVO" | string;
  fecha_creacion?: string;
  fecha_modificacion?: string;
};

// ---------- Core Fetch ----------

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (res.status === 401 && typeof window !== "undefined" && !url.includes("/api/auth/login") && !url.includes("/api/auth/me")) {
    window.location.href = "/login?expired=true";
    throw new Error("Sesión expirada. Redirigiendo al inicio de sesión...");
  }

  const json: ApiResponse<T> = await res.json();

  if (!json.success) {
    throw new Error((json as ApiError).error || "Error desconocido");
  }

  return (json as ApiSuccess<T>).data;
}

// ---------- Auth ----------

export const api = {
  auth: {
    login: (usuario: string, password: string) =>
      apiFetch<LoginResult>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ usuario, password }),
      }),
    logout: () =>
      apiFetch<unknown>("/api/auth/logout", { method: "POST" }),
    me: () => apiFetch<SessionData>("/api/auth/me"),
  },

  clientes: {
    list: () => apiFetch<Cliente[]>("/api/clientes"),
    create: (data: Omit<Cliente, "id" | "id_cliente" | "fecha_creacion" | "fecha_modificacion">) =>
      apiFetch<Cliente>("/api/clientes", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (data: Partial<Cliente> & { id_cliente: string }) =>
      apiFetch<Cliente>("/api/clientes", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id_cliente: string) =>
      apiFetch<{ id_cliente: string; eliminado: boolean }>(
        `/api/clientes?id_cliente=${encodeURIComponent(id_cliente)}`,
        { method: "DELETE" }
      ),
  },

  prestamos: {
    list: () => apiFetch<PrestamoConDetalle[]>("/api/prestamos"),
    getById: (id_prestamo: string) =>
      apiFetch<PrestamoConDetalle[]>(`/api/prestamos?id_prestamo=${encodeURIComponent(id_prestamo)}`).then(
        (list) => list[0] ?? null,
      ),
    create: (data: { id_cliente: string; monto: number; interes: number; dias: number; fecha_inicio: string }) =>
      apiFetch<CrearPrestamoResult>("/api/prestamos", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (data: { id_prestamo: string; estado: string }) =>
      apiFetch<Prestamo>("/api/prestamos", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id_prestamo: string) =>
      apiFetch<{ id_prestamo: string; cuotas_eliminadas: number; eliminado: boolean }>(
        `/api/prestamos?id_prestamo=${encodeURIComponent(id_prestamo)}`,
        { method: "DELETE" }
      ),
  },

  cuotas: {
    listByPrestamo: (id_prestamo: string) =>
      apiFetch<Cuota[]>(`/api/cuotas?id_prestamo=${encodeURIComponent(id_prestamo)}`),
  },

  pagos: {
    list: () => apiFetch<PagoConDetalle[]>("/api/pagos"),
    create: (data: { id_prestamo: string; id_cuota: string; monto_pagado: number; fecha_pago?: string; observacion?: string }) =>
      apiFetch<CrearPagoResult>("/api/pagos", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  dashboard: {
    get: () => apiFetch<DashboardData>("/api/dashboard"),
  },

  reportes: {
    prestamos: () => apiFetch<ReportePrestamo[]>("/api/reportes/prestamos"),
    pagos: () => apiFetch<ReportePago[]>("/api/reportes/pagos"),
    morosos: () => apiFetch<ReporteMoroso[]>("/api/reportes/morosos"),
  },

  usuarios: {
    list: () => apiFetch<UsuarioItem[]>("/api/usuarios"),
    create: (data: { usuario: string; correo: string; password?: string; rol: string; estado?: string }) =>
      apiFetch<UsuarioItem>("/api/usuarios", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (data: { id_usuario: string; usuario?: string; correo?: string; password?: string; rol?: string; estado?: string }) =>
      apiFetch<UsuarioItem>("/api/usuarios", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id_usuario: string) =>
      apiFetch<{ id_usuario: string; eliminado: boolean }>(
        `/api/usuarios?id_usuario=${encodeURIComponent(id_usuario)}`,
        { method: "DELETE" },
      ),
  },
};
