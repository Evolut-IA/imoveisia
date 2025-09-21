#!/usr/bin/env node

// Script para migrar estrutura para banco externo
import { spawn } from 'child_process';

async function migrateToExternal() {
  const bancoExterno = process.env.BANCODEDADOS;
  
  if (!bancoExterno) {
    console.error('❌ Secret BANCODEDADOS não encontrada');
    process.exit(1);
  }

  console.log('🚀 Iniciando migração de estrutura para banco externo...');
  console.log('📍 Usando BANCODEDADOS como DATABASE_URL temporariamente');

  return new Promise((resolve, reject) => {
    // Executar npm run db:push --force com BANCODEDADOS como DATABASE_URL
    const env = { ...process.env };
    env.DATABASE_URL = bancoExterno; // Temporariamente substitui DATABASE_URL
    
    const dbPush = spawn('npm', ['run', 'db:push', '--', '--force'], {
      env: env,
      stdio: 'inherit'
    });

    dbPush.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Estrutura criada com sucesso no banco externo!');
        resolve();
      } else {
        console.error('❌ Erro ao criar estrutura no banco externo');
        reject(new Error(`db:push falhou com código ${code}`));
      }
    });

    dbPush.on('error', (error) => {
      console.error('❌ Erro ao executar db:push:', error);
      reject(error);
    });
  });
}

migrateToExternal()
  .then(() => {
    console.log('🎉 Migração de estrutura concluída!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Erro na migração:', error.message);
    process.exit(1);
  });