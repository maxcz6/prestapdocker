import { ApiError } from "@/lib/errors";
import { getPostgresPool } from "@/lib/postgres";
import fs from "fs";
import path from "path";

const TABLE_PK_MAP: Record<string, string> = {
  clientes: "id_cliente",
  prestamos: "id_prestamo",
  cuotas: "id_cuota",
  pagos: "id_pago",
  usuarios: "id_usuario",
};

const TABLE_COLUMNS: Record<string, string[]> = {
  usuarios: [
    "id_usuario",
    "usuario",
    "correo",
    "password_hash",
    "password_salt",
    "rol",
    "estado",
    "fecha_creacion",
    "fecha_modificacion",
  ],
  clientes: [
    "id_cliente",
    "dni",
    "nombres_apellidos",
    "nombre_negocio",
    "celular",
    "direccion_puesto",
    "fecha_creacion",
    "fecha_modificacion",
  ],
  prestamos: [
    "id_prestamo",
    "id_cliente",
    "monto",
    "interes",
    "monto_interes",
    "total_pagar",
    "dias",
    "cuota_diaria",
    "fecha_inicio",
    "fecha_fin",
    "estado",
    "fecha_creacion",
    "fecha_modificacion",
  ],
  cuotas: [
    "id_cuota",
    "id_prestamo",
    "numero_cuota",
    "fecha_vencimiento",
    "monto",
    "estado",
    "fecha_creacion",
    "fecha_modificacion",
  ],
  pagos: [
    "id_pago",
    "id_prestamo",
    "id_cuota",
    "numero_cuota",
    "fecha_pago",
    "monto_pagado",
    "observacion",
    "fecha_creacion",
    "fecha_modificacion",
    "id_usuario",
  ],
};

function getPrimaryKey(tabla: string): string {
  const normalized = tabla.toLowerCase();
  return TABLE_PK_MAP[normalized] || "id";
}

function cleanPayload(tabla: string, data: Record<string, unknown>): Record<string, unknown> {
  const normalizedTable = tabla.toLowerCase();
  const allowed = TABLE_COLUMNS[normalizedTable];
  const now = new Date().toISOString();

  const cleaned: Record<string, unknown> = {};

  if (allowed) {
    for (const col of allowed) {
      if (data[col] !== undefined) {
        cleaned[col] = data[col];
      }
    }
  } else {
    Object.assign(cleaned, data);
    delete cleaned.id;
  }

  if (allowed?.includes("fecha_creacion") && !cleaned.fecha_creacion) {
    cleaned.fecha_creacion = now;
  }
  if (allowed?.includes("fecha_modificacion")) {
    cleaned.fecha_modificacion = now;
  }

  return cleaned;
}

// Fallback JSON local para cuando no esté levantado el contenedor de PostgreSQL
const LOCAL_DB_PATH = path.resolve(process.cwd(), "data", "local_db.json");

function readLocalJsonDb(): Record<string, Record<string, unknown>[]> {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const content = fs.readFileSync(LOCAL_DB_PATH, "utf-8");
      return JSON.parse(content);
    }
  } catch {}
  return { usuarios: [], clientes: [], prestamos: [], cuotas: [], pagos: [] };
}

function writeLocalJsonDb(db: Record<string, Record<string, unknown>[]>) {
  try {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch {}
}

function leerTablaLocalJson<T>(tabla: string): T[] {
  const db = readLocalJsonDb();
  return (db[tabla.toLowerCase()] || []) as T[];
}

function insertarFilaLocalJson<T extends Record<string, unknown>>(tabla: string, datos: T) {
  const db = readLocalJsonDb();
  const normalized = tabla.toLowerCase();
  if (!db[normalized]) db[normalized] = [];
  const payload = cleanPayload(normalized, datos);
  db[normalized].push(payload);
  writeLocalJsonDb(db);
  const pk = getPrimaryKey(normalized);
  return { success: true, id: String(payload[pk] ?? ""), data: payload };
}

function insertarFilasLocalJson<T extends Record<string, unknown>>(tabla: string, filas: T[]) {
  const db = readLocalJsonDb();
  const normalized = tabla.toLowerCase();
  if (!db[normalized]) db[normalized] = [];
  const inserted: Record<string, unknown>[] = [];
  for (const fila of filas) {
    const payload = cleanPayload(normalized, fila);
    db[normalized].push(payload);
    inserted.push(payload);
  }
  writeLocalJsonDb(db);
  return { success: true, count: inserted.length, data: inserted };
}

function actualizarFilaLocalJson<T extends Record<string, unknown>>(tabla: string, id: string, datos: T) {
  const db = readLocalJsonDb();
  const normalized = tabla.toLowerCase();
  const pk = getPrimaryKey(normalized);
  const rows = db[normalized] || [];
  const idx = rows.findIndex((r) => String(r[pk]) === String(id));
  if (idx !== -1) {
    const payload = cleanPayload(normalized, datos);
    rows[idx] = { ...rows[idx], ...payload };
    writeLocalJsonDb(db);
    return { success: true, data: rows[idx] };
  }
  return { success: false, data: null };
}

function eliminarFilaLocalJson(tabla: string, id: string) {
  const db = readLocalJsonDb();
  const normalized = tabla.toLowerCase();
  const pk = getPrimaryKey(normalized);
  const rows = db[normalized] || [];
  db[normalized] = rows.filter((r) => String(r[pk]) !== String(id));
  writeLocalJsonDb(db);
  return { success: true, id };
}

// ============================================================
// FUNCIONES DE ACCESO A BASE DE DATOS PURAMENTE LOCAL (POSTGRESQL)
// ============================================================

export async function leerTabla<T>(tabla: string): Promise<T[]> {
  try {
    const pool = getPostgresPool();
    const normalizedTable = tabla.toLowerCase();
    const pk = getPrimaryKey(normalizedTable);
    const res = await pool.query(`SELECT * FROM public.${normalizedTable} ORDER BY ${pk} ASC`);
    return res.rows as T[];
  } catch (err) {
    return leerTablaLocalJson<T>(tabla);
  }
}

export async function insertarFila<T extends Record<string, unknown>>(
  tabla: string,
  datos: T,
) {
  try {
    const pool = getPostgresPool();
    const normalizedTable = tabla.toLowerCase();
    const payload = cleanPayload(normalizedTable, datos);
    const pk = getPrimaryKey(normalizedTable);

    const keys = Object.keys(payload);
    const values = Object.values(payload);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");

    const query = `
      INSERT INTO public.${normalizedTable} (${keys.join(", ")})
      VALUES (${placeholders})
      RETURNING *
    `;

    const res = await pool.query(query, values);
    const row = res.rows[0];

    return {
      success: true,
      id: row ? String(row[pk] ?? "") : undefined,
      data: row,
    };
  } catch {
    return insertarFilaLocalJson(tabla, datos);
  }
}

export async function insertarFilas<T extends Record<string, unknown>>(
  tabla: string,
  filas: T[],
) {
  if (filas.length === 0) return { success: true, count: 0 };

  try {
    const pool = getPostgresPool();
    const client = await pool.connect();
    const normalizedTable = tabla.toLowerCase();
    const inserted: unknown[] = [];

    try {
      await client.query("BEGIN");
      for (const fila of filas) {
        const payload = cleanPayload(normalizedTable, fila);
        const keys = Object.keys(payload);
        const values = Object.values(payload);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");

        const query = `
          INSERT INTO public.${normalizedTable} (${keys.join(", ")})
          VALUES (${placeholders})
          RETURNING *
        `;
        const res = await client.query(query, values);
        inserted.push(res.rows[0]);
      }
      await client.query("COMMIT");
      return {
        success: true,
        count: inserted.length,
        data: inserted,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch {
    return insertarFilasLocalJson(tabla, filas);
  }
}

export async function actualizarFila<T extends Record<string, unknown>>(
  tabla: string,
  id: string,
  datos: T,
) {
  try {
    const pool = getPostgresPool();
    const normalizedTable = tabla.toLowerCase();
    const pk = getPrimaryKey(normalizedTable);
    const payload = cleanPayload(normalizedTable, datos);
    delete payload[pk];

    const keys = Object.keys(payload);
    const values = Object.values(payload);
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");

    const query = `
      UPDATE public.${normalizedTable}
      SET ${setClauses}
      WHERE ${pk} = $${keys.length + 1}
      RETURNING *
    `;

    const res = await pool.query(query, [...values, id]);
    return {
      success: true,
      data: res.rows[0],
    };
  } catch {
    return actualizarFilaLocalJson(tabla, id, datos);
  }
}

export async function eliminarFila(tabla: string, id: string) {
  try {
    const pool = getPostgresPool();
    const normalizedTable = tabla.toLowerCase();
    const pk = getPrimaryKey(normalizedTable);

    await pool.query(`DELETE FROM public.${normalizedTable} WHERE ${pk} = $1`, [id]);
    return {
      success: true,
      id,
    };
  } catch {
    return eliminarFilaLocalJson(tabla, id);
  }
}

export async function crearPrestamoConCuotasAtomic(
  tablaPrestamos: string,
  tablaCuotas: string,
  prestamo: Record<string, unknown>,
  cuotas: Record<string, unknown>[],
) {
  const pResult = await insertarFila(tablaPrestamos, prestamo);
  const cResult = await insertarFilas(tablaCuotas, cuotas);

  return {
    success: true,
    id_prestamo: pResult.id,
    id: pResult.id,
    cuotas_insertadas: cResult.count,
  };
}

export async function registrarPagoAtomic(
  tablaPagos: string,
  tablaCuotas: string,
  tablaPrestamos: string,
  pago: Record<string, unknown>,
  idCuota: string,
  idPrestamo: string,
  estadoPrestamo: string,
) {
  const pResult = await insertarFila(tablaPagos, pago);

  await actualizarFila(tablaCuotas, idCuota, {
    estado: "PAGADA",
  });

  await actualizarFila(tablaPrestamos, idPrestamo, {
    estado: estadoPrestamo,
  });

  return {
    success: true,
    id_pago: pResult.id,
    id: pResult.id,
  };
}

