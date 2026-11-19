import { Pool } from "pg";

let pool: Pool | null = null;

export function isLocalPostgresConfigured(): boolean {
  return Boolean(
    process.env.DATABASE_URL ||
    process.env.DB_HOST ||
    process.env.POSTGRES_HOST
  );
}

export function getPostgresPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      pool = new Pool({ connectionString });
    } else {
      pool = new Pool({
        host: process.env.DB_HOST || process.env.POSTGRES_HOST || "app-db",
        port: Number(process.env.DB_PORT || process.env.POSTGRES_PORT || 5432),
        database: process.env.DB_DATABASE || process.env.POSTGRES_DB || "bd_proyecto_staging",
        user: process.env.DB_USERNAME || process.env.POSTGRES_USER || "staging_user",
        password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
      });
    }
  }
  return pool;
}
