import postgres from "postgres";
import type { Sql } from "postgres";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema.js";

export type DatabaseConnection = {
  readonly sql: Sql;
  readonly close: () => Promise<void>;
};

async function runMigration(sql: Sql): Promise<void> {
  await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

  const applied =
    await sql`SELECT version FROM schema_migrations WHERE version = ${SCHEMA_VERSION}`;

  if (applied.length > 0) {
    return;
  }

  await sql.unsafe(SCHEMA_SQL);
  await sql`INSERT INTO schema_migrations (version) VALUES (${SCHEMA_VERSION})`;
}

export async function createDatabaseConnection(databaseUrl: string): Promise<DatabaseConnection> {
  const sql = postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => undefined,
  });

  await runMigration(sql);

  return {
    sql,
    close: async (): Promise<void> => {
      await sql.end();
    },
  };
}
