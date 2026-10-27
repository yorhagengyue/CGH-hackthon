import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

type NeonClient = NeonQueryFunction<false, false>;

const globalForPush = globalThis as typeof globalThis & {
  pushDatabase?: NeonClient;
};

export function getPushDatabase(): NeonClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL must be set to connect to Neon.");
  }

  globalForPush.pushDatabase ??= neon(connectionString);
  return globalForPush.pushDatabase;
}
