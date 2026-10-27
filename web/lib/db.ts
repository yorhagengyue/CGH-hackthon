// One query() for both worlds:
//   DATABASE_URL set  -> cloud Postgres via `pg`
//   otherwise         -> PGlite (Postgres in WASM) persisted under .pglite/ for local dev
// Same SQL, same $1 placeholders.
import "server-only";

type Row = Record<string, unknown>;
type Q = <T extends Row = Row>(sql: string, params?: unknown[]) => Promise<T[]>;

declare global {
  // eslint-disable-next-line no-var
  var __db: { query: Q; ready: Promise<void> } | undefined;
}

async function makeDb(): Promise<{ query: Q; ready: Promise<void> }> {
  const url = process.env.DATABASE_URL;
  let query: Q;
  if (url) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false }, max: 5 });
    query = async (sql, params = []) => (await pool.query(sql, params)).rows;
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const pg = new PGlite(process.env.PGLITE_DIR ?? ".pglite");
    query = async (sql, params = []) => (await pg.query(sql, params)).rows as never;
  }
  const { SCHEMA } = await import("./schema");
  const ready = (async () => { await query(SCHEMA); const { seedIfEmpty } = await import("./seed"); await seedIfEmpty(query); })();
  return { query, ready };
}

export async function db(): Promise<Q> {
  if (!globalThis.__db) globalThis.__db = await makeDb();
  await globalThis.__db.ready;
  return globalThis.__db.query;
}

export async function one<T extends Row = Row>(sql: string, params?: unknown[]): Promise<T | null> {
  const q = await db();
  const rows = await q<T>(sql, params);
  return rows[0] ?? null;
}
