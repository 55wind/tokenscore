import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

export type DB = LibSQLDatabase<typeof schema>;

const url = process.env.DATABASE_URL ?? "file:./data/tokenscore.db";

const globalForDb = globalThis as unknown as { __tokenscoreClient?: Client; __tokenscoreDb?: DB };

const client =
  globalForDb.__tokenscoreClient ?? createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
export const db: DB = globalForDb.__tokenscoreDb ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__tokenscoreClient = client;
  globalForDb.__tokenscoreDb = db;
}

export { schema };
