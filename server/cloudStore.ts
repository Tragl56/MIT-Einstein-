import pg from 'pg';

export interface SnapshotTransaction {
  snapshot: unknown;
  commit(snapshot: unknown): Promise<void>;
  rollback(): Promise<void>;
}
export interface SnapshotStore { begin(): Promise<SnapshotTransaction> }

export function postgresSnapshotStore(connectionString: string): SnapshotStore {
  const url = new URL(connectionString.replace(/^postgresql\+asyncpg:/, 'postgresql:'));
  for (const key of ['sslmode', 'ssl']) url.searchParams.delete(key);
  const pool = new pg.Pool({ connectionString: url.href, ssl: { rejectUnauthorized: true }, max: 2,
    connectionTimeoutMillis: 10_000, idleTimeoutMillis: 10_000, allowExitOnIdle: true });
  return {
    async begin() {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query("SET LOCAL lock_timeout = '10s'");
        await client.query("INSERT INTO oncoflow_demo_snapshot (id) VALUES ('mobile-demo') ON CONFLICT DO NOTHING");
        const result = await client.query("SELECT snapshot FROM oncoflow_demo_snapshot WHERE id = 'mobile-demo' FOR UPDATE");
        let finished = false;
        const release = () => { if (!finished) { finished = true; client.release(); } };
        return {
          snapshot: result.rows[0].snapshot,
          async commit(snapshot: unknown) {
            try {
              await client.query("UPDATE oncoflow_demo_snapshot SET snapshot = $1::jsonb, updated_at = now() WHERE id = 'mobile-demo'", [JSON.stringify(snapshot)]);
              await client.query('COMMIT');
            } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
            finally { release(); }
          },
          async rollback() { try { if (!finished) await client.query('ROLLBACK'); } finally { release(); } },
        };
      } catch (error) { await client.query('ROLLBACK').catch(() => {}); client.release(); throw error; }
    },
  };
}
