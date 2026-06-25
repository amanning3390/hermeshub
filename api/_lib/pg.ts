/**
 * node-postgres pool for flows that need real interactive transactions.
 *
 * The Drizzle/neon-http client (`db.ts`) speaks Neon's stateless HTTP protocol,
 * which cannot hold `BEGIN ... SELECT FOR UPDATE ... COMMIT` across statements.
 * The Founder-500 atomic claim requires row locks (`FOR UPDATE SKIP LOCKED`), so
 * it runs over a pooled TCP connection here. All values are parameterized.
 */
import { Pool, type PoolClient } from "pg";

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (_pool) return _pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL environment variable is not set");
  _pool = new Pool({ connectionString: url, max: 3, idleTimeoutMillis: 10_000 });
  return _pool;
}

/**
 * Run `fn` inside a transaction, committing on success and rolling back on any
 * thrown error. The client is always released back to the pool.
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* connection already broken; pool will discard it */
    }
    throw err;
  } finally {
    client.release();
  }
}
