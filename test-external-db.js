// Teste de conexão com banco externo usando BANCODEDADOS
import { Pool } from 'pg';

async function testExternalConnection() {
  const bancoExterno = process.env.BANCODEDADOS;
  
  if (!bancoExterno) {
    console.error('❌ Secret BANCODEDADOS não encontrada');
    return false;
  }

  console.log('🔌 Testando conexão com banco externo...');
  
  const pool = new Pool({ connectionString: bancoExterno });
  
  try {
    const client = await pool.connect();
    
    // Testar conexão básica
    const result = await client.query('SELECT version(), current_database()');
    console.log('✅ Conexão estabelecida com sucesso!');
    console.log('📊 Versão PostgreSQL:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    console.log('🗄️  Database:', result.rows[0].current_database);
    
    // Verificar extensões disponíveis
    const extensions = await client.query("SELECT extname FROM pg_extension ORDER BY extname");
    console.log('🔌 Extensões disponíveis:', extensions.rows.map(r => r.extname).join(', '));
    
    // Listar tabelas existentes (se houver)
    const tables = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    if (tables.rows.length > 0) {
      console.log('📋 Tabelas existentes:', tables.rows.map(r => r.tablename).join(', '));
    } else {
      console.log('📋 Nenhuma tabela encontrada - banco vazio');
    }
    
    client.release();
    await pool.end();
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao conectar com banco externo:', error.message);
    try {
      await pool.end();
    } catch (e) {}
    return false;
  }
}

testExternalConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });