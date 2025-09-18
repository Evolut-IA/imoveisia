// Script de migração do banco de dados v2
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import ws from "ws";

const { Client } = pg;

// Configurar WebSocket para o banco antigo (Neon)
neonConfig.webSocketConstructor = ws;

// Banco atual (origem) - Neon com WebSocket
const oldDatabaseUrl = process.env.DATABASE_URL;
const oldPool = new Pool({ connectionString: oldDatabaseUrl });
const oldDb = drizzle({ client: oldPool });

// Novo banco (destino) - PostgreSQL padrão
const newDatabaseUrl = process.env.BANCODEDADOS;
const newClient = new Client({ connectionString: newDatabaseUrl });
const newDb = drizzlePg(newClient);

async function migrateDatabae() {
  console.log('🚀 Iniciando migração de dados...');
  
  try {
    // Conectar ao novo banco
    await newClient.connect();
    console.log('✅ Conectado ao novo banco PostgreSQL');
    
    // 1. Criar tabelas no novo banco
    console.log('📋 Criando schema no novo banco...');
    
    await newClient.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "username" text NOT NULL UNIQUE,
        "password" text NOT NULL
      );
    `);

    await newClient.query(`
      CREATE TABLE IF NOT EXISTS "properties" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" text NOT NULL,
        "description" text,
        "property_type" text NOT NULL,
        "state" text NOT NULL,
        "city" text NOT NULL,
        "neighborhood" text NOT NULL,
        "address" text,
        "zip_code" text,
        "bedrooms" integer,
        "bathrooms" integer,
        "parking_spaces" integer,
        "area" integer,
        "price" numeric(12,2) NOT NULL,
        "condo_fee" numeric(8,2),
        "iptu" numeric(8,2),
        "business_type" text NOT NULL,
        "amenities" text[],
        "main_image" text,
        "contact_name" text,
        "contact_phone" text,
        "contact_email" text,
        "embedding" text,
        "created_at" text DEFAULT now()
      );
    `);

    await newClient.query(`
      CREATE TABLE IF NOT EXISTS "chat_messages" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "session_id" text NOT NULL,
        "role" text NOT NULL,
        "content" text NOT NULL,
        "property_ids" text[],
        "timestamp" text DEFAULT now()
      );
    `);

    await newClient.query(`
      CREATE TABLE IF NOT EXISTS "conversations" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "session_id" text NOT NULL UNIQUE,
        "lead_name" text NOT NULL,
        "lead_whatsapp" text NOT NULL,
        "privacy_accepted" boolean NOT NULL DEFAULT true,
        "messages" jsonb NOT NULL,
        "created_at" text DEFAULT now(),
        "updated_at" text DEFAULT now()
      );
    `);

    console.log('✅ Schema criado com sucesso no novo banco!');

    // 2. Copiar dados dos usuários
    console.log('👥 Copiando usuários...');
    const usersResult = await oldDb.execute(sql`SELECT * FROM users`);
    const users = usersResult.rows || usersResult;
    
    if (users && users.length > 0) {
      for (const user of users) {
        await newClient.query(
          'INSERT INTO users (id, username, password) VALUES ($1, $2, $3)',
          [user.id, user.username, user.password]
        );
      }
      console.log(`✅ ${users.length} usuários copiados`);
    } else {
      console.log('ℹ️  Nenhum usuário para copiar');
    }

    // 3. Copiar propriedades
    console.log('🏠 Copiando propriedades...');
    const propertiesResult = await oldDb.execute(sql`SELECT * FROM properties`);
    const properties = propertiesResult.rows || propertiesResult;
    
    for (const property of properties) {
      await newClient.query(`
        INSERT INTO properties (
          id, title, description, property_type, state, city, neighborhood, 
          address, zip_code, bedrooms, bathrooms, parking_spaces, area, 
          price, condo_fee, iptu, business_type, amenities, main_image, 
          contact_name, contact_phone, contact_email, embedding, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`,
        [
          property.id, property.title, property.description, 
          property.property_type, property.state, property.city, 
          property.neighborhood, property.address, property.zip_code, 
          property.bedrooms, property.bathrooms, property.parking_spaces, 
          property.area, property.price, property.condo_fee, 
          property.iptu, property.business_type, property.amenities, 
          property.main_image, property.contact_name, property.contact_phone, 
          property.contact_email, property.embedding, property.created_at
        ]
      );
    }
    console.log(`✅ ${properties.length} propriedades copiadas`);

    // 4. Copiar mensagens do chat
    console.log('💬 Copiando mensagens de chat...');
    const chatMessagesResult = await oldDb.execute(sql`SELECT * FROM chat_messages`);
    const chatMessages = chatMessagesResult.rows || chatMessagesResult;
    
    for (const message of chatMessages) {
      await newClient.query(`
        INSERT INTO chat_messages (
          id, session_id, role, content, property_ids, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          message.id, message.session_id, message.role, 
          message.content, message.property_ids, message.timestamp
        ]
      );
    }
    console.log(`✅ ${chatMessages.length} mensagens copiadas`);

    // 5. Copiar conversas
    console.log('🗣️ Copiando conversas...');
    const conversationsResult = await oldDb.execute(sql`SELECT * FROM conversations`);
    const conversations = conversationsResult.rows || conversationsResult;
    
    if (conversations && conversations.length > 0) {
      for (const conversation of conversations) {
        await newClient.query(`
          INSERT INTO conversations (
            id, session_id, lead_name, lead_whatsapp, privacy_accepted, 
            messages, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            conversation.id, conversation.session_id, conversation.lead_name, 
            conversation.lead_whatsapp, conversation.privacy_accepted, 
            conversation.messages, conversation.created_at, conversation.updated_at
          ]
        );
      }
      console.log(`✅ ${conversations.length} conversas copiadas`);
    } else {
      console.log('ℹ️  Nenhuma conversa para copiar');
    }

    console.log('🎉 Migração completada com sucesso!');

    // 6. Verificar dados no novo banco
    const newPropertiesCount = await newClient.query('SELECT COUNT(*) as count FROM properties');
    const newMessagesCount = await newClient.query('SELECT COUNT(*) as count FROM chat_messages');
    
    console.log(`📊 Verificação final:`);
    console.log(`   - Propriedades no novo banco: ${newPropertiesCount.rows[0].count}`);
    console.log(`   - Mensagens no novo banco: ${newMessagesCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  } finally {
    if (oldPool) await oldPool.end();
    if (newClient) await newClient.end();
  }
}

migrateDatabae().catch(console.error);