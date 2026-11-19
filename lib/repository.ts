import {
  normalizarCliente,
  normalizarCuota,
  normalizarPago,
  normalizarPrestamo,
} from "@/lib/business";
import { leerTabla } from "@/lib/db";
import { TABLES } from "@/lib/tables";
import type { Cliente, Cuota, Pago, Prestamo, Usuario } from "@/types/domain";

export async function getClientes() {
  const rows = await leerTabla<Partial<Cliente>>(TABLES.clientes);
  return rows.map(normalizarCliente);
}

export async function getPrestamos() {
  const rows = await leerTabla<Partial<Prestamo>>(TABLES.prestamos);
  return rows.map(normalizarPrestamo);
}

export async function getCuotas() {
  const rows = await leerTabla<Partial<Cuota>>(TABLES.cuotas);
  return rows.map(normalizarCuota);
}

export async function getPagos() {
  const rows = await leerTabla<Partial<Pago>>(TABLES.pagos);
  return rows.map(normalizarPago);
}

export async function getUsuarios() {
  const rows = await leerTabla<Partial<Usuario>>(TABLES.usuarios);
  return rows
    .map((usuario) => {
      const row = usuario as Record<string, unknown>;

      return {
        id: String(row.id_usuario ?? row.id ?? "").trim(),
        id_usuario: String(row.id_usuario ?? row.id ?? "").trim(),
        usuario: String(row.usuario ?? row.nombre_usuario ?? "").trim(),
        correo: String(row.correo ?? row.email ?? "").trim(),
        password: "",
        password_hash: String(row.password_hash ?? "").trim(),
        password_salt: String(row.password_salt ?? "").trim(),
        rol: String(row.rol ?? "").trim(),
        estado: String(row.estado ?? "ACTIVO").trim(),
        fecha_creacion: String(row.fecha_creacion ?? "").trim(),
        fecha_modificacion: String(row.fecha_modificacion ?? "").trim(),
      };
    })
    .filter((u) => u.id_usuario !== "" && u.usuario !== "");
}

export async function getCarteraData() {
  const [clientes, prestamos, cuotas, pagos] = await Promise.all([
    getClientes(),
    getPrestamos(),
    getCuotas(),
    getPagos(),
  ]);

  return { clientes, prestamos, cuotas, pagos };
}
