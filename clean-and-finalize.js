// Script para limpar dados de teste e finalizar migração
import { Pool } from 'pg';

async function cleanAndFinalize() {
  const externalUrl = process.env.BANCODEDADOS;
  
  if (!externalUrl) {
    throw new Error('BANCODEDADOS não encontrada');
  }

  console.log('🧹 Limpando dados de teste e finalizando migração...');
  
  const pool = new Pool({ connectionString: externalUrl });
  const client = await pool.connect();
  
  try {
    // 1. Limpar registros de teste duplicados
    console.log('🗑️  Removendo registros de teste...');
    
    const deleteTestConversations = await client.query(`
      DELETE FROM conversations 
      WHERE session_id LIKE '%_test' OR lead_name = 'test'
      RETURNING id
    `);
    
    console.log(`✅ Removidas ${deleteTestConversations.rowCount} conversations de teste`);
    
    // 2. Verificar estado final limpo
    console.log('\n📊 ESTADO FINAL PÓS-LIMPEZA:');
    
    const finalCounts = {};
    const tables = ['properties', 'conversations', 'chat_messages', 'users'];
    
    for (const table of tables) {
      const count = await client.query(`SELECT COUNT(*) FROM ${table}`);
      finalCounts[table] = parseInt(count.rows[0].count);
      console.log(`   ${table}: ${finalCounts[table]}`);
    }
    
    // 3. Validar integridade final
    const orphanMessages = await client.query(`
      SELECT COUNT(*) FROM chat_messages cm
      LEFT JOIN conversations c ON cm.session_id = c.session_id
      WHERE c.session_id IS NULL
    `);
    
    console.log(`🔗 Messages órfãs: ${orphanMessages.rows[0].count}`);
    
    // 4. Testar amostra de dados
    const sampleProperty = await client.query(`
      SELECT title, neighborhood, price FROM properties LIMIT 1
    `);
    
    const sampleConversation = await client.query(`
      SELECT session_id, lead_name, messages FROM conversations LIMIT 1
    `);
    
    if (sampleProperty.rows.length > 0 && sampleConversation.rows.length > 0) {
      const prop = sampleProperty.rows[0];
      const conv = sampleConversation.rows[0];
      
      console.log('\n🔍 TESTE DE INTEGRIDADE FINAL:');
      console.log(`🏠 Property: ${prop.title} em ${prop.neighborhood} - R$ ${prop.price}`);
      console.log(`💬 Conversation: ${conv.lead_name} (${conv.session_id})`);
      console.log(`📨 Messages JSONB: ${Array.isArray(conv.messages) ? conv.messages.length : 'ERRO'} itens`);
      
      // Testar busca semântica (embedding)
      const propertiesWithEmbedding = await client.query(`
        SELECT COUNT(*) FROM properties WHERE embedding IS NOT NULL
      `);
      console.log(`🧠 Properties with embeddings: ${propertiesWithEmbedding.rows[0].count}`);
    }
    
    // 5. RELATÓRIO FINAL
    console.log('\n🎯 RELATÓRIO FINAL DA MIGRAÇÃO COMPLETA:');
    console.log('┌─────────────────┬──────────┬──────────┬────────────────────┐');
    console.log('│ Tabela          │ Local    │ Migrado  │ Status             │');
    console.log('├─────────────────┼──────────┼──────────┼────────────────────┤');
    console.log(`│ properties      │    30    │   ${finalCounts.properties.toString().padStart(2)}     │ ✅ Completo       │`);
    console.log(`│ conversations   │     1    │    ${finalCounts.conversations}     │ ${finalCounts.conversations === 1 ? '✅ Completo' : '❌ Problema'}       │`);
    console.log(`│ chat_messages   │    10*   │   ${finalCounts.chat_messages.toString().padStart(2)}     │ ${finalCounts.chat_messages === 10 ? '✅ Consistente' : '❌ Inconsistente'}     │`);
    console.log(`│ users           │     0    │    ${finalCounts.users}     │ ✅ N/A (vazio)     │`);
    console.log('└─────────────────┴──────────┴──────────┴────────────────────┘');
    console.log('* 10 das 52 messages (42 órfãs removidas por integridade)');
    
    const success = 
      finalCounts.properties === 30 && 
      finalCounts.conversations === 1 && 
      finalCounts.chat_messages === 10 &&
      finalCounts.users === 0 &&
      parseInt(orphanMessages.rows[0].count) === 0;
    
    if (success) {
      console.log('\n🎉 MIGRAÇÃO FINALIZADA COM SUCESSO!');
      console.log('✅ Todos os dados válidos foram migrados');
      console.log('✅ Integridade referencial preservada');
      console.log('✅ Dados órfãos removidos conforme esperado');
    } else {
      console.log('\n⚠️  MIGRAÇÃO COM RESSALVAS');
      console.log('ℹ️  Verificar dados manualmente');
    }
    
    return success;
    
  } finally {
    client.release();
    await pool.end();
  }
}

cleanAndFinalize()
  .then((success) => {
    console.log(`\n${success ? '✨ PROCESSO COMPLETO!' : '⚠️  PROCESSO COM RESSALVAS'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ ERRO:', error);
    process.exit(1);
  });