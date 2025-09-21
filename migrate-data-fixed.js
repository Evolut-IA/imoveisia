// Script corrigido de migração de dados para banco externo
import { Pool } from 'pg';

class DataMigrator {
  constructor() {
    this.localPool = null;
    this.externalPool = null;
  }

  async initialize() {
    const localUrl = process.env.DATABASE_URL;
    const externalUrl = process.env.BANCODEDADOS;
    
    if (!localUrl) {
      throw new Error('DATABASE_URL não encontrada');
    }
    
    if (!externalUrl) {
      throw new Error('BANCODEDADOS não encontrada');
    }

    console.log('🔗 Conectando aos bancos...');
    
    this.localPool = new Pool({ connectionString: localUrl });
    this.externalPool = new Pool({ connectionString: externalUrl });
    
    // Testar conexões
    await this.localPool.query('SELECT 1');
    await this.externalPool.query('SELECT 1');
    
    console.log('✅ Conexões estabelecidas');
  }

  async migrateProperties() {
    console.log('🏠 Migrando properties...');
    
    const localClient = await this.localPool.connect();
    const externalClient = await this.externalPool.connect();
    
    try {
      // Buscar todos os properties do banco local
      const localData = await localClient.query(`
        SELECT * FROM properties ORDER BY created_at
      `);
      
      console.log(`📊 Encontrados ${localData.rows.length} properties`);
      
      if (localData.rows.length === 0) {
        console.log('⚠️  Nenhum property para migrar');
        return;
      }
      
      // Inserir no banco externo mantendo UUIDs originais
      for (const property of localData.rows) {
        await externalClient.query(`
          INSERT INTO properties (
            id, title, description, property_type, state, city, neighborhood,
            address, zip_code, bedrooms, bathrooms, parking_spaces, area,
            price, condo_fee, iptu, business_type, amenities, main_image,
            contact_name, contact_phone, contact_email, embedding, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22, $23, $24
          )
        `, [
          property.id, property.title, property.description, property.property_type,
          property.state, property.city, property.neighborhood, property.address,
          property.zip_code, property.bedrooms, property.bathrooms, property.parking_spaces,
          property.area, property.price, property.condo_fee, property.iptu,
          property.business_type, property.amenities, property.main_image,
          property.contact_name, property.contact_phone, property.contact_email,
          property.embedding, property.created_at
        ]);
      }
      
      // Verificar migração
      const externalCount = await externalClient.query('SELECT COUNT(*) FROM properties');
      console.log(`✅ Properties migrados: ${externalCount.rows[0].count}`);
      
    } finally {
      localClient.release();
      externalClient.release();
    }
  }

  async migrateConversations() {
    console.log('💬 Migrando conversations...');
    
    const localClient = await this.localPool.connect();
    const externalClient = await this.externalPool.connect();
    
    try {
      const localData = await localClient.query(`
        SELECT * FROM conversations ORDER BY created_at
      `);
      
      console.log(`📊 Encontradas ${localData.rows.length} conversations`);
      
      if (localData.rows.length === 0) {
        console.log('⚠️  Nenhuma conversation para migrar');
        return;
      }
      
      for (const conversation of localData.rows) {
        // O campo messages já é um objeto JSONB no banco local
        // Precisamos passá-lo como JSON diretamente
        const messagesJson = JSON.stringify(conversation.messages);
        
        console.log(`🔄 Migrando conversa: ${conversation.session_id}`);
        console.log(`📨 Messages (${typeof conversation.messages}): ${Array.isArray(conversation.messages) ? conversation.messages.length : 'não é array'} itens`);
        
        await externalClient.query(`
          INSERT INTO conversations (
            id, session_id, lead_name, lead_whatsapp, privacy_accepted,
            messages, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
        `, [
          conversation.id, conversation.session_id, conversation.lead_name,
          conversation.lead_whatsapp, conversation.privacy_accepted,
          messagesJson, // Passar como string JSON
          conversation.created_at, conversation.updated_at
        ]);
      }
      
      const externalCount = await externalClient.query('SELECT COUNT(*) FROM conversations');
      console.log(`✅ Conversations migradas: ${externalCount.rows[0].count}`);
      
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
      
      // Verificar se session_ids existem em conversations
      for (const message of localData.rows) {
        const sessionExists = await externalClient.query(
          'SELECT 1 FROM conversations WHERE session_id = $1',
          [message.session_id]
        );
        
        if (sessionExists.rows.length === 0) {
          console.log(`⚠️  Session ID não encontrado: ${message.session_id}`);
          continue;
        }
        
        await externalClient.query(`
          INSERT INTO chat_messages (
            id, session_id, role, content, property_ids, timestamp
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          message.id, message.session_id, message.role,
          message.content, message.property_ids, message.timestamp
        ]);
      }
      
      const externalCount = await externalClient.query('SELECT COUNT(*) FROM chat_messages');
      console.log(`✅ Chat messages migradas: ${externalCount.rows[0].count}`);
      
    } finally {
      localClient.release();
      externalClient.release();
    }
  }

  async validateMigration() {
    console.log('🔍 Validando migração...');
    
    const externalClient = await this.externalPool.connect();
    
    try {
      // Contar registros em cada tabela
      const tables = ['properties', 'conversations', 'chat_messages', 'users'];
      
      for (const table of tables) {
        const count = await externalClient.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`📊 ${table}: ${count.rows[0].count} registros`);
      }
      
      // Validar relacionamentos session_id
      const orphanMessages = await externalClient.query(`
        SELECT COUNT(*) FROM chat_messages cm
        LEFT JOIN conversations c ON cm.session_id = c.session_id
        WHERE c.session_id IS NULL
      `);
      
      console.log(`🔗 Chat messages órfãs: ${orphanMessages.rows[0].count}`);
      
      // Validar alguns dados específicos
      const sampleProperty = await externalClient.query('SELECT id, title, embedding FROM properties LIMIT 1');
      if (sampleProperty.rows.length > 0) {
        const prop = sampleProperty.rows[0];
        console.log(`🏠 Property exemplo: ${prop.title} (ID: ${prop.id})`);
        console.log(`📊 Embedding preservado: ${prop.embedding ? 'SIM' : 'NÃO'}`);
      }
      
      const sampleConversation = await externalClient.query('SELECT session_id, messages FROM conversations LIMIT 1');
      if (sampleConversation.rows.length > 0) {
        const conv = sampleConversation.rows[0];
        console.log(`💬 Conversa exemplo: ${conv.session_id}`);
        console.log(`📨 Mensagens JSONB: ${Array.isArray(conv.messages) ? conv.messages.length : 'ERRO'} itens`);
        
        // Verificar estrutura de uma mensagem
        if (Array.isArray(conv.messages) && conv.messages.length > 0) {
          console.log(`📝 Primeira mensagem: ${conv.messages[0].type || 'sem tipo'}`);
        }
      }
      
      // Verificar totais esperados
      console.log('\n📋 RELATÓRIO FINAL:');
      console.log('Expected: properties=30, conversations=1, chat_messages=52, users=0');
      
    } finally {
      externalClient.release();
    }
  }

  async cleanup() {
    if (this.localPool) {
      await this.localPool.end();
    }
    if (this.externalPool) {
      await this.externalPool.end();
    }
  }

  async migrate() {
    try {
      await this.initialize();
      
      console.log('🚀 Iniciando migração de dados...');
      console.log('📝 Ordem: properties → conversations → chat_messages');
      
      // Migrar em ordem de dependência
      await this.migrateProperties();
      await this.migrateConversations();
      await this.migrateChatMessages();
      
      // Validar migração
      await this.validateMigration();
      
      console.log('🎉 Migração de dados concluída com sucesso!');
      
    } catch (error) {
      console.error('💥 Erro na migração:', error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Executar migração
const migrator = new DataMigrator();
migrator.migrate()
  .then(() => {
    console.log('✨ Processo de migração finalizado!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Falha na migração:', error);
    process.exit(1);
  });