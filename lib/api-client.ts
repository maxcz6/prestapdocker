import type { Cliente, Prestamo, Cuota, Pago } from "@/types/domain";
import { localApi, storage } from "@/lib/storage";

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

// Pequeño retardo simulado para una experiencia fluida
const delay = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- API Adapter (Almacenamiento Local en Navegador) ----------

export const api = {
  auth: {
    login: async (usuario: string, password?: string) => {
      await delay(60);
      return localApi.auth.login(usuario, password);
    },
    logout: async () => {
      await delay(40);
      return localApi.auth.logout();
    },
    me: async () => {
      await delay(30);
      return localApi.auth.me();
    },
  },

  clientes: {
    list: async () => {
      await delay(50);
      return localApi.clientes.list();
    },
    create: async (data: Omit<Cliente, "id" | "id_cliente" | "fecha_creacion" | "fecha_modificacion">) => {
      await delay(80);
      return localApi.clientes.create(data);
    },
    update: async (data: Partial<Cliente> & { id_cliente: string }) => {
      await delay(80);
      return localApi.clientes.update(data);
    },
    delete: async (id_cliente: string) => {
      await delay(60);
      return localApi.clientes.delete(id_cliente);
    },
  },

  prestamos: {
    list: async () => {
      await delay(60);
      return localApi.prestamos.list();
    },
    getById: async (id_prestamo: string) => {
      await delay(40);
      return localApi.prestamos.getById(id_prestamo);
    },
    create: async (data: { id_cliente: string; monto: number; interes: number; dias: number; fecha_inicio: string }) => {
      await delay(90);
      return localApi.prestamos.create(data);
    },
    update: async (data: { id_prestamo: string; estado: string }) => {
      await delay(60);
      return localApi.prestamos.update(data);
    },
    delete: async (id_prestamo: string) => {
      await delay(60);
      return localApi.prestamos.delete(id_prestamo);
    },
  },

  cuotas: {
    listByPrestamo: async (id_prestamo: string) => {
      await delay(40);
      return localApi.cuotas.listByPrestamo(id_prestamo);
    },
  },

  pagos: {
    list: async () => {
      await delay(60);
      return localApi.pagos.list();
    },
    create: async (data: { id_prestamo: string; id_cuota: string; monto_pagado: number; fecha_pago?: string; observacion?: string }) => {
      await delay(90);
      return localApi.pagos.create(data);
    },
  },

  dashboard: {
    get: async () => {
      await delay(60);
      return localApi.dashboard.get();
    },
  },

  reportes: {
    prestamos: async () => {
      await delay(60);
      return localApi.reportes.prestamos();
    },
    pagos: async () => {
      await delay(60);
      return localApi.reportes.pagos();
    },
    morosos: async () => {
      await delay(60);
      return localApi.reportes.morosos();
    },
  },

  usuarios: {
    list: async () => {
      await delay(50);
      return localApi.usuarios.list();
    },
    create: async (data: { usuario: string; correo: string; password?: string; rol: string; estado?: string }) => {
      await delay(70);
      return localApi.usuarios.create(data);
    },
    update: async (data: { id_usuario: string; usuario?: string; correo?: string; password?: string; rol?: string; estado?: string }) => {
      await delay(70);
      return localApi.usuarios.update(data);
    },
    delete: async (id_usuario: string) => {
      await delay(60);
      return localApi.usuarios.delete(id_usuario);
    },
  },

  // Utilidad para restablecer los datos de demostración
  resetDemoData: () => {
    storage.resetToDemo();
  },
};
