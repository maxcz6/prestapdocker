import { jsonError, jsonOk } from "@/lib/errors";
import { TABLES } from "@/lib/tables";
import { verificarSessionCookie, SESSION_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";
import { getPostgresPool, isLocalPostgresConfigured } from "@/lib/postgres";
import fs from "fs";
import path from "path";

async function checkTable(tableName: string) {
  if (isLocalPostgresConfigured()) {
    try {
      const pool = getPostgresPool();
      const res = await pool.query(`SELECT count(*)::int as count FROM public.${tableName}`);
      return {
        ok: true,
        table: tableName,
        rows: res.rows[0]?.count ?? 0,
      };
    } catch (err) {
      return {
        ok: false,
        table: tableName,
        rows: 0,
        error: err instanceof Error ? err.message : "Error de conexion PostgreSQL local",
      };
    }
  }

  // Fallback a almacenamiento local JSON
  try {
    const jsonPath = path.resolve(process.cwd(), "data", "local_db.json");
    if (fs.existsSync(jsonPath)) {
      const content = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      const rows = content[tableName.toLowerCase()]?.length ?? 0;
      return { ok: true, table: tableName, rows };
    }
    return { ok: true, table: tableName, rows: 0 };
  } catch (error) {
    return {
      ok: false,
      table: tableName,
      rows: 0,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

export async function GET() {
  try {
    const isLocal = true;
    const dbType = isLocalPostgresConfigured() ? "postgres-local (app-db)" : "json-local (offline)";

    const entries = Object.values(TABLES);
    const checks = await Promise.all(entries.map((table) => checkTable(table)));
    const ok = checks.every((item) => item.ok);

    const cookieStore = await cookies();
    const session = verificarSessionCookie(cookieStore.get(SESSION_COOKIE)?.value);
    const isAdmin = session?.rol.toUpperCase() === "ADMIN";

    if (!isAdmin) {
      return jsonOk({ ok, db: dbType, local: isLocal }, ok ? 200 : 207);
    }

    return jsonOk({ ok, db: dbType, local: isLocal, checks }, ok ? 200 : 207);
  } catch (error) {
    return jsonError(error);
  }
}
