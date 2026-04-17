import postgres from "postgres";
import type { Sql } from "postgres";
import { SCHEMA_SQL } from "./schema.js";

export type DatabaseConnection = {
  readonly sql: Sql;
  readonly close: () => Promise<void>;
};

export async function createDatabaseConnection(databaseUrl: string): Promise<DatabaseConnection> {
  const sql = postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => undefined,
  });

  // Run schema migration on startup
  await sql.unsafe(SCHEMA_SQL);

  return {
    sql,
    close: async (): Promise<void> => {
      await sql.end();
    },
  };
}
