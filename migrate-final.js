// Script final de migração com solução JSONB correta
import { Pool } from 'pg';

class FinalMigrator {
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
    console.log('💬 Migrando conversations com solução JSONB...');
    
    const localClient = await this.localPool.connect();
    const externalClient = await this.externalPool.connect();
    
    try {
      const localData = await localClient.query(`SELECT * FROM conversations`);
      
      console.log(`📊 Encontradas ${localData.rows.length} conversations`);
      
      for (const conversation of localData.rows) {
        console.log(`🔄 Migrando: ${conversation.session_id} (${conversation.lead_name})`);
        
        // A SOLUÇÃO: JSON.stringify + cast ::jsonb
        await externalClient.query(`
          INSERT INTO conversations (
            id, session_id, lead_name, lead_whatsapp, privacy_accepted,
            messages, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
        `, [
          conversation.id,
          conversation.session_id,
          conversation.lead_name,
          conversation.lead_whatsapp,
          conversation.privacy_accepted,
          JSON.stringify(conversation.messages), // ✅ Stringify + cast
          conversation.created_at,
          conversation.updated_at
        ]);
        
        console.log(`✅ Conversa migrada com ${conversation.messages.length} mensagens`);
      }
      
      const externalCount = await externalClient.query('SELECT COUNT(*) FROM conversations');
      console.log(`📊 Total conversations: ${externalCount.rows[0].count}`);
      
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
      
      let migrated = 0;
      let skipped = 0;
      
      for (const message of localData.rows) {
        // Verificar se session_id existe
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
      
    } finally {
      localClient.release();
      externalClient.release();
    }
  }

  async validateFinalMigration() {
    console.log('🔍 VALIDAÇÃO FINAL DA MIGRAÇÃO COMPLETA...');
    
    const externalClient = await this.externalPool.connect();
    
    try {
      const results = {};
      
      // Contar todos os registros
      const tables = ['properties', 'conversations', 'chat_messages', 'users'];
      
      console.log('📊 CONTAGEM DE REGISTROS:');
      for (const table of tables) {
        const count = await externalClient.query(`SELECT COUNT(*) FROM ${table}`);
        results[table] = parseInt(count.rows[0].count);
        console.log(`   ${table}: ${results[table]}`);
      }
      
      // Validar relacionamentos
      const orphanMessages = await externalClient.query(`
        SELECT COUNT(*) FROM chat_messages cm
        LEFT JOIN conversations c ON cm.session_id = c.session_id
        WHERE c.session_id IS NULL
      `);
      
      console.log(`🔗 Mensagens órfãs: ${orphanMessages.rows[0].count}`);
      
      // Testar integridade JSONB
      const conversationTest = await externalClient.query(`
        SELECT session_id, messages, lead_name 
        FROM conversations 
        LIMIT 1
      `);
      
      if (conversationTest.rows.length > 0) {
        const conv = conversationTest.rows[0];
        console.log('\n💬 TESTE DE INTEGRIDADE JSONB:');
        console.log(`   Session: ${conv.session_id}`);
        console.log(`   Lead: ${conv.lead_name}`);
        console.log(`   Messages válidas: ${Array.isArray(conv.messages) ? 'SIM' : 'NÃO'}`);
        console.log(`   Total mensagens: ${conv.messages?.length || 0}`);
        
        // Testar se conseguimos acessar dados específicos das mensagens
        if (Array.isArray(conv.messages) && conv.messages.length > 0) {
          console.log(`   Primeira msg tipo: ${conv.messages[0]?.type || 'N/A'}`);
        }
      }
      
      // RELATÓRIO FINAL
      console.log('\n🎯 RELATÓRIO FINAL DA MIGRAÇÃO:');
      console.log('┌─────────────────┬──────────┬──────────┬────────┐');
      console.log('│ Tabela          │ Esperado │ Migrado  │ Status │');
      console.log('├─────────────────┼──────────┼──────────┼────────┤');
      console.log(`│ properties      │    30    │   ${results.properties.toString().padStart(2)}     │   ${results.properties === 30 ? '✅' : '❌'}   │`);
      console.log(`│ conversations   │     1    │    ${results.conversations}     │   ${results.conversations === 1 ? '✅' : '❌'}   │`);
      console.log(`│ chat_messages   │    52    │   ${results.chat_messages.toString().padStart(2)}     │   ${results.chat_messages === 52 ? '✅' : '❌'}   │`);
      console.log(`│ users           │     0    │    ${results.users}     │   ${results.users === 0 ? '✅' : '❌'}   │`);
      console.log('└─────────────────┴──────────┴──────────┴────────┘');
      
      const allPassed = 
        results.properties === 30 && 
        results.conversations === 1 && 
        results.chat_messages === 52 && 
        results.users === 0 &&
        parseInt(orphanMessages.rows[0].count) === 0;
      
      if (allPassed) {
        console.log('\n🎉 MIGRAÇÃO 100% SUCESSO! Todos os dados foram migrados corretamente.');
      } else {
        console.log('\n⚠️  MIGRAÇÃO INCOMPLETA - Verificar dados em falta.');
      }
      
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
      
      console.log('🚀 MIGRAÇÃO FINAL - CONVERSATIONS E CHAT_MESSAGES');
      console.log('🏠 Properties já migrados: 30 registros ✅');
      
      await this.migrateConversations();
      await this.migrateChatMessages();
      
      const success = await this.validateFinalMigration();
      
      return success;
      
    } catch (error) {
      console.error('💥 Erro na migração final:', error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

const migrator = new FinalMigrator();
migrator.migrate()
  .then((success) => {
    if (success) {
      console.log('\n✨ MIGRAÇÃO COMPLETA FINALIZADA COM SUCESSO!');
      console.log('🎯 Todos os dados foram migrados para o banco externo.');
    } else {
      console.log('\n⚠️  MIGRAÇÃO FINALIZADA COM RESSALVAS');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ FALHA NA MIGRAÇÃO FINAL:', error);
    process.exit(1);
  });