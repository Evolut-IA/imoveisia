import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use the new PostgreSQL database
const databaseUrl = process.env.DATABASE_URL || process.env.BANCODEDADOS;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL deve estar configurada. Verifique as variáveis de ambiente.",
  );
}

console.log('🔌 Conectando ao banco PostgreSQL...');
export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool, { schema });
