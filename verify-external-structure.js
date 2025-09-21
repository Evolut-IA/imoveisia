// Verificar estrutura criada no banco externo
import { Pool } from 'pg';

async function verifyExternalStructure() {
  const bancoExterno = process.env.BANCODEDADOS;
  
  if (!bancoExterno) {
    console.error('❌ Secret BANCODEDADOS não encontrada');
    return false;
  }

  console.log('🔍 Verificando estrutura no banco externo...');
  
  const pool = new Pool({ connectionString: bancoExterno });
  
  try {
    const client = await pool.connect();
    
    // Listar todas as tabelas criadas
    const tables = await client.query(`
      SELECT tablename, schemaname 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    console.log('📋 Tabelas encontradas:', tables.rows.length);
    
    const expectedTables = ['users', 'properties', 'chat_messages', 'conversations'];
    const foundTables = tables.rows.map(r => r.tablename);
    
    for (const table of expectedTables) {
      if (foundTables.includes(table)) {
        console.log(`✅ Tabela '${table}' - CRIADA`);
        
        // Verificar colunas da tabela
        const columns = await client.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position
        `, [table]);
        
        console.log(`   📊 Colunas (${columns.rows.length}):`, 
          columns.rows.map(c => `${c.column_name}(${c.data_type})`).join(', ')
        );
      } else {
        console.log(`❌ Tabela '${table}' - NÃO ENCONTRADA`);
      }
    }
    
    // Verificar se há dados nas tabelas
    for (const table of foundTables) {
      const count = await client.query(`SELECT COUNT(*) as total FROM ${table}`);
      console.log(`📊 ${table}: ${count.rows[0].total} registros`);
    }
    
    client.release();
    await pool.end();
    
    return foundTables.length === expectedTables.length;
    
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error.message);
    try {
      await pool.end();
    } catch (e) {}
    return false;
  }
}

verifyExternalStructure()
  .then(success => {
    if (success) {
      console.log('🎉 Estrutura validada com sucesso!');
    } else {
      console.log('⚠️  Problemas encontrados na estrutura');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });