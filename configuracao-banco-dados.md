# Configuração do Banco de Dados

## Visão Geral
Este projeto utiliza **PostgreSQL** como banco de dados principal, hospedado no **Neon** (serviço serverless). A configuração usa **Drizzle ORM** para gerenciamento de dados e operações de banco.

## Tecnologias Utilizadas

### Banco de Dados
- **PostgreSQL** - Banco relacional principal
- **Neon** - Provedor serverless PostgreSQL
- **Drizzle ORM** - ORM para TypeScript/JavaScript
- **Drizzle Kit** - Ferramenta para migrações e schema management

### Bibliotecas de Conexão
- `@neondatabase/serverless` - Cliente Neon para conexão serverless
- `drizzle-orm/neon-serverless` - Driver Drizzle para Neon
- `ws` - WebSocket para conexão real-time

## Estrutura de Configuração

### 1. Conexão com Banco (`server/db.ts`)
```typescript
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";

// Configuração WebSocket para Neon
neonConfig.webSocketConstructor = ws;

// Pool de conexões
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// Instância Drizzle
export const db = drizzle({ client: pool, schema });
```

### 2. Configuração Drizzle (`drizzle.config.ts`)
```typescript
export default defineConfig({
  out: "./migrations",           // Diretório de migrações
  schema: "./shared/schema.ts",  // Localização do schema
  dialect: "postgresql",         // Dialeto do banco
  dbCredentials: {
    url: process.env.DATABASE_URL  // String de conexão
  }
});
```

## Schema do Banco de Dados

### Tabelas Principais

#### 1. **users** - Usuários do Sistema
- `id` - VARCHAR (UUID) - Chave primária
- `username` - TEXT - Nome de usuário único
- `password` - TEXT - Senha criptografada

#### 2. **properties** - Propriedades Imobiliárias
- `id` - VARCHAR (UUID) - Chave primária
- `title` - TEXT - Título da propriedade
- `description` - TEXT - Descrição detalhada
- `propertyType` - TEXT - Tipo (casa, apartamento, etc.)
- `state` - TEXT - Estado
- `city` - TEXT - Cidade
- `neighborhood` - TEXT - Bairro
- `address` - TEXT - Endereço completo
- `zipCode` - TEXT - CEP
- `bedrooms` - INTEGER - Número de quartos
- `bathrooms` - INTEGER - Número de banheiros
- `parkingSpaces` - INTEGER - Vagas de garagem
- `area` - INTEGER - Área em m²
- `price` - DECIMAL - Preço de venda/locação
- `condoFee` - DECIMAL - Taxa de condomínio
- `iptu` - DECIMAL - IPTU anual
- `businessType` - TEXT - Tipo de negócio (venda/locação)
- `amenities` - TEXT[] - Array de comodidades
- `mainImage` - TEXT - URL da imagem principal
- `contactName` - TEXT - Nome do contato
- `contactPhone` - TEXT - Telefone do contato
- `contactEmail` - TEXT - Email do contato
- `embedding` - TEXT - Vector embedding para busca semântica
- `createdAt` - TEXT - Data de criação

#### 3. **chatMessages** - Mensagens do Chat
- `id` - VARCHAR (UUID) - Chave primária
- `sessionId` - TEXT - ID da sessão de chat
- `role` - TEXT - Papel (user/assistant)
- `content` - TEXT - Conteúdo da mensagem
- `propertyIds` - TEXT[] - IDs das propriedades referenciadas
- `timestamp` - TEXT - Timestamp da mensagem

#### 4. **conversations** - Conversas Completas
- `id` - VARCHAR (UUID) - Chave primária
- `sessionId` - TEXT - ID único da sessão
- `leadName` - TEXT - Nome do lead
- `leadWhatsApp` - TEXT - WhatsApp do lead
- `privacyAccepted` - BOOLEAN - Aceitação de privacidade
- `messages` - JSONB - Array de todas as mensagens
- `createdAt` - TEXT - Data de criação
- `updatedAt` - TEXT - Data de atualização

## Funcionalidades Especiais

### 1. **Vector Database Integration**
- Utiliza embeddings do OpenAI para busca semântica
- Propriedades são indexadas por similaridade
- Permite buscas inteligentes por descrição natural

### 2. **Dual Storage System**
O sistema suporta dois tipos de armazenamento:
- **DatabaseStorage** - Persistência no PostgreSQL (padrão)
- **MemStorage** - Armazenamento em memória (desenvolvimento/testes)

### 3. **Schemas de Validação**
Usa Zod para validação de dados com schemas automáticos:
- `insertUserSchema` - Validação para criação de usuários
- `insertPropertySchema` - Validação para propriedades
- `insertChatMessageSchema` - Validação para mensagens
- `insertConversationSchema` - Validação para conversas

## Variáveis de Ambiente

### Obrigatórias
- `DATABASE_URL` - String de conexão com PostgreSQL/Neon

### Exemplo de DATABASE_URL
```
postgresql://username:password@host:port/database?sslmode=require
```

## Comandos de Gerenciamento

### Sincronizar Schema
```bash
npm run db:push
```

### Forçar Sincronização (com possível perda de dados)
```bash
npm run db:push --force
```

## Segurança e Boas Práticas

1. **Conexão Segura** - Usa SSL/TLS para todas as conexões
2. **Pool de Conexões** - Gerenciamento eficiente de conexões
3. **Validação de Dados** - Schemas Zod para validação robusta
4. **UUIDs** - Chaves primárias com UUID para segurança
5. **Environment Variables** - Credenciais seguras via variáveis de ambiente

## Monitoramento e Logs

- Logs de conexão ativa no console: `🗄️ Storage: DatabaseStorage active`
- Verificação automática de `DATABASE_URL` na inicialização
- Logs de operações através do sistema de storage

---

*Documentação criada em: 18 de setembro de 2025*
*Sistema: Plataforma Imobiliária com IA*