export type CuotaEstado = "PENDIENTE" | "PAGADA" | "VENCIDA";
export type PrestamoEstado = "PENDIENTE" | "ACTIVO" | "PAGADO" | "VENCIDO" | "CANCELADO";

export type Cliente = {
  id: string;
  id_cliente: string;
  dni: string;
  nombres_apellidos: string;
  nombre_negocio: string;
  celular: string;
  direccion_puesto: string;
  fecha_creacion: string;
  fecha_modificacion: string;
};

export type Prestamo = {
  id: string;
  id_prestamo: string;
  id_cliente: string;
  monto: number;
  interes: number;
  monto_interes: number;
  total_pagar: number;
  dias: number;
  cuota_diaria: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: PrestamoEstado;
  fecha_creacion: string;
  fecha_modificacion: string;
};

export type Cuota = {
  id: string;
  id_cuota: string;
  id_prestamo: string;
  numero_cuota: number;
  fecha_vencimiento: string;
  monto: number;
  estado: CuotaEstado;
  fecha_creacion: string;
  fecha_modificacion: string;
};

export type Pago = {
  id: string;
  id_pago: string;
  id_prestamo: string;
  id_cuota: string;
  numero_cuota: number;
  fecha_pago: string;
  monto_pagado: number;
  observacion: string;
  fecha_creacion: string;
  fecha_modificacion: string;
};

export type Usuario = {
  id: string;
  id_usuario: string;
  usuario: string;
  correo: string;
  password: string;
  password_hash: string;
  password_salt: string;
  rol: string;
  estado: string;
  fecha_creacion: string;
  fecha_modificacion: string;
};
