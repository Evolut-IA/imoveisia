// Script para inspecionar o campo JSONB messages
import { Pool } from 'pg';

async function inspectJsonb() {
  const localUrl = process.env.DATABASE_URL;
  
  if (!localUrl) {
    throw new Error('DATABASE_URL não encontrada');
  }

  console.log('🔍 Inspecionando campo JSONB messages...');
  
  const pool = new Pool({ connectionString: localUrl });
  
  try {
    const client = await pool.connect();
    
    // Buscar conversa
    const conversation = await client.query(`
      SELECT id, session_id, lead_name, messages 
      FROM conversations 
      LIMIT 1
    `);
    
    if (conversation.rows.length === 0) {
      console.log('❌ Nenhuma conversa encontrada');
      return;
    }
    
    const conv = conversation.rows[0];
    
    console.log('📝 Dados da conversa:');
    console.log(`ID: ${conv.id}`);
    console.log(`Session: ${conv.session_id}`);
    console.log(`Lead: ${conv.lead_name}`);
    console.log(`Messages type: ${typeof conv.messages}`);
    console.log(`Is Array: ${Array.isArray(conv.messages)}`);
    
    if (Array.isArray(conv.messages)) {
      console.log(`Length: ${conv.messages.length}`);
      
      // Mostrar primeira mensagem
      if (conv.messages.length > 0) {
        console.log('\n📨 Primeira mensagem:');
        console.log('Type:', typeof conv.messages[0]);
        console.log('Keys:', Object.keys(conv.messages[0] || {}));
        console.log('JSON stringify:', JSON.stringify(conv.messages[0], null, 2));
      }
      
      // Testar se conseguimos serializar todo o array
      try {
        const serialized = JSON.stringify(conv.messages);
        console.log(`\n✅ JSON válido - tamanho: ${serialized.length} chars`);
        
        // Testar parse
        const parsed = JSON.parse(serialized);
        console.log(`✅ Parse OK - ${parsed.length} items`);
        
      } catch (error) {
        console.error('❌ Erro ao serializar/parsear:', error.message);
      }
    } else {
      console.log('Messages não é array:', conv.messages);
    }
    
    // Testar inserção direta no banco externo
    const externalUrl = process.env.BANCODEDADOS;
    if (externalUrl) {
      console.log('\n🧪 Testando inserção no banco externo...');
      
      const externalPool = new Pool({ connectionString: externalUrl });
      const externalClient = await externalPool.connect();
      
      try {
        // Primeiro limpar se já existe
        await externalClient.query(`DELETE FROM conversations WHERE id = $1`, [conv.id]);
        
        // Tentar inserir usando diferentes abordagens
        console.log('Tentativa 1: Passando objeto diretamente...');
        
        try {
          await externalClient.query(`
            INSERT INTO conversations (
              id, session_id, lead_name, lead_whatsapp, privacy_accepted,
              messages, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            conv.id,
            conv.session_id,
            conv.lead_name,
            'test',
            true,
            conv.messages, // Objeto diretamente
            new Date().toISOString(),
            new Date().toISOString()
          ]);
          
          console.log('✅ Sucesso - objeto direto');
          
        } catch (error1) {
          console.log('❌ Falha objeto direto:', error1.message);
          
          console.log('Tentativa 2: JSON.stringify...');
          try {
            await externalClient.query(`
              INSERT INTO conversations (
                id, session_id, lead_name, lead_whatsapp, privacy_accepted,
                messages, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
            `, [
              conv.id + '_test',
              conv.session_id + '_test',
              conv.lead_name,
              'test',
              true,
              JSON.stringify(conv.messages), // String JSON
              new Date().toISOString(),
              new Date().toISOString()
            ]);
            
            console.log('✅ Sucesso - JSON string com cast');
            
          } catch (error2) {
            console.log('❌ Falha JSON string:', error2.message);
            
            console.log('Debug: Primeiro item messages:');
            if (conv.messages[0]) {
              console.log(JSON.stringify(conv.messages[0], null, 2).substring(0, 500) + '...');
            }
          }
        }
        
      } finally {
        externalClient.release();
        await externalPool.end();
      }
    }
    
    client.release();
    
  } finally {
    await pool.end();
  }
}

inspectJsonb()
  .then(() => {
    console.log('✨ Inspeção concluída');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });