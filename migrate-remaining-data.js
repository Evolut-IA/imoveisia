// Script para migrar conversations e chat_messages restantes
import { Pool } from 'pg';

class RemainingDataMigrator {
  constructor() {
    this.localPool = null;
    this.externalPool = null;
  }

  async initialize() {
    const localUrl = process.env.DATABASE_URL;
    const externalUrl = process.env.BANCODEDADOS;
    
    if (!localUrl || !externalUrl) {
      throw new Error('DATABASE_URL e BANCODEDADOS devem estar configuradas');
    }

    console.log('🔗 Conectando aos bancos...');
    
    this.localPool = new Pool({ connectionString: localUrl });
    this.externalPool = new Pool({ connectionString: externalUrl });
    
    await this.localPool.query('SELECT 1');
    await this.externalPool.query('SELECT 1');
    
    console.log('✅ Conexões estabelecidas');
  }

  async migrateConversations() {
    console.log('💬 Migrando conversations...');
    
    const localClient = await this.localPool.connect();
    const externalClient = await this.externalPool.connect();
    
    try {
      const localData = await localClient.query(`SELECT * FROM conversations`);
      
      console.log(`📊 Encontradas ${localData.rows.length} conversations`);
      
      if (localData.rows.length === 0) {
        console.log('⚠️  Nenhuma conversation para migrar');
        return;
      }
      
      for (const conversation of localData.rows) {
        console.log(`🔄 Migrando conversa: ${conversation.session_id}`);
        console.log(`👤 Lead: ${conversation.lead_name}`);
        
        // Verificar se é um objeto ou string
        let messagesData = conversation.messages;
        
        if (typeof messagesData === 'string') {
          try {
            messagesData = JSON.parse(messagesData);
          } catch (e) {
            console.error('❌ Erro ao parsear messages JSON:', e.message);
            continue;
          }
        }
        
        console.log(`📨 Messages: ${Array.isArray(messagesData) ? messagesData.length : typeof messagesData} itens`);
        
        // Inserir usando cast explícito para JSONB
        await externalClient.query(`
          INSERT INTO conversations (
            id, session_id, lead_name, lead_whatsapp, privacy_accepted,
            messages, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          conversation.id,
          conversation.session_id,
          conversation.lead_name,
          conversation.lead_whatsapp,
          conversation.privacy_accepted,
          messagesData, // Passar o objeto diretamente
          conversation.created_at,
          conversation.updated_at
        ]);
        
        console.log(`✅ Conversa ${conversation.session_id} migrada`);
      }
      
      const externalCount = await externalClient.query('SELECT COUNT(*) FROM conversations');
      console.log(`✅ Total conversations no destino: ${externalCount.rows[0].count}`);
      
    } finally {
      localClient.release();
      externalClient.release();
    }
  }

  async migrateChatMessages() {
    console.log('💌 Migrando chat_messages...');
    
    const localClient = await this.localPool.connect();
    const externalClient = await this.externalPool.connect();
    
    try {
      const localData = await localClient.query(`
        SELECT * FROM chat_messages ORDER BY timestamp
      `);
      
      console.log(`📊 Encontradas ${localData.rows.length} chat_messages`);
      
      if (localData.rows.length === 0) {
        console.log('⚠️  Nenhuma message para migrar');
        return;
      }
      
      let migrated = 0;
      let skipped = 0;
      
      for (const message of localData.rows) {
        // Verificar se session_id existe em conversations no banco externo
        const sessionExists = await externalClient.query(
          'SELECT 1 FROM conversations WHERE session_id = $1',
          [message.session_id]
        );
        
        if (sessionExists.rows.length === 0) {
          console.log(`⚠️  Session ID não encontrado: ${message.session_id}`);
          skipped++;
          continue;
        }
        
        await externalClient.query(`
          INSERT INTO chat_messages (
            id, session_id, role, content, property_ids, timestamp
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          message.id,
          message.session_id,
          message.role,
          message.content,
          message.property_ids,
          message.timestamp
        ]);
        
        migrated++;
      }
      
      console.log(`✅ Chat messages migradas: ${migrated}`);
      console.log(`⚠️  Chat messages puladas: ${skipped}`);
      
      const externalCount = await externalClient.query('SELECT COUNT(*) FROM chat_messages');
      console.log(`📊 Total no destino: ${externalCount.rows[0].count}`);
      
    } finally {
      localClient.release();
      externalClient.release();
    }
  }

  async validateMigration() {
    console.log('🔍 Validando migração completa...');
    
    const externalClient = await this.externalPool.connect();
    
    try {
      const results = {};
      
      // Contar registros finais
      const tables = ['properties', 'conversations', 'chat_messages', 'users'];
      
      for (const table of tables) {
        const count = await externalClient.query(`SELECT COUNT(*) FROM ${table}`);
        results[table] = parseInt(count.rows[0].count);
        console.log(`📊 ${table}: ${results[table]} registros`);
      }
      
      // Validar relacionamentos
      const orphanMessages = await externalClient.query(`
        SELECT COUNT(*) FROM chat_messages cm
        LEFT JOIN conversations c ON cm.session_id = c.session_id
        WHERE c.session_id IS NULL
      `);
      
      console.log(`🔗 Chat messages órfãs: ${orphanMessages.rows[0].count}`);
      
      // Relatório comparativo
      console.log('\n📋 RELATÓRIO FINAL DA MIGRAÇÃO:');
      console.log('Expected vs Migrated:');
      console.log(`Properties: 30 → ${results.properties} ${results.properties === 30 ? '✅' : '❌'}`);
      console.log(`Conversations: 1 → ${results.conversations} ${results.conversations === 1 ? '✅' : '❌'}`);
      console.log(`Chat Messages: 52 → ${results.chat_messages} ${results.chat_messages === 52 ? '✅' : '❌'}`);
      console.log(`Users: 0 → ${results.users} ${results.users === 0 ? '✅' : '❌'}`);
      
      // Testar integridade JSONB
      const conversationSample = await externalClient.query(`
        SELECT session_id, messages, lead_name 
        FROM conversations 
        LIMIT 1
      `);
      
      if (conversationSample.rows.length > 0) {
        const conv = conversationSample.rows[0];
        console.log(`\n💬 Teste de integridade JSONB:`);
        console.log(`Session: ${conv.session_id}`);
        console.log(`Lead: ${conv.lead_name}`);
        console.log(`Messages: ${Array.isArray(conv.messages) ? 'Array válido' : 'ERRO'} com ${conv.messages?.length || 0} itens`);
      }
      
      const allPassed = 
        results.properties === 30 && 
        results.conversations === 1 && 
        results.chat_messages === 52 && 
        results.users === 0 &&
        parseInt(orphanMessages.rows[0].count) === 0;
      
      return allPassed;
      
    } finally {
      externalClient.release();
    }
  }

  async cleanup() {
    if (this.localPool) await this.localPool.end();
    if (this.externalPool) await this.externalPool.end();
  }

  async migrate() {
    try {
      await this.initialize();
      
      console.log('🚀 Continuando migração de dados restantes...');
      
      await this.migrateConversations();
      await this.migrateChatMessages();
      
      const success = await this.validateMigration();
      
      if (success) {
        console.log('🎉 Migração completa bem-sucedida!');
      } else {
        console.log('⚠️  Migração concluída com ressalvas - verificar relatório');
      }
      
      return success;
      
    } catch (error) {
      console.error('💥 Erro na migração:', error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

const migrator = new RemainingDataMigrator();
migrator.migrate()
  .then((success) => {
    console.log('✨ Processo finalizado!');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Falha:', error);
    process.exit(1);
  });