import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { Pool as PgPool } from 'pg';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon WebSocket
neonConfig.webSocketConstructor = ws;

// Determine which database to use
const newDatabaseUrl = process.env.BANCODEDADOS;
const oldDatabaseUrl = process.env.DATABASE_URL;

if (!newDatabaseUrl && !oldDatabaseUrl) {
  throw new Error(
    "DATABASE_URL ou BANCODEDADOS deve estar configurada. Verifique as variáveis de ambiente.",
  );
}

let pool: any;
let db: any;

if (newDatabaseUrl) {
  // Use standard PostgreSQL for the new database
  console.log('🔌 Conectando ao banco PostgreSQL padrão...');
  pool = new PgPool({ connectionString: newDatabaseUrl });
  db = drizzlePg(pool, { schema });
} else {
  // Use Neon WebSocket for the old database
  console.log('🔌 Conectando ao banco Neon (WebSocket)...');
  pool = new NeonPool({ connectionString: oldDatabaseUrl });
  db = drizzleNeon({ client: pool, schema });
}

export { pool, db };
