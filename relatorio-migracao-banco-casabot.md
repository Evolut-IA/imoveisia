# Relatório de Análise do Banco de Dados CasaBot
## Preparação para Migração para Banco Externo

**Data da Análise:** 21 de setembro de 2025  
**Banco Atual:** PostgreSQL (Replit integrado)  
**Banco Destino:** PostgreSQL externo (usando secret BANCODEDADOS)

---

## 1. RESUMO EXECUTIVO

O banco de dados atual do CasaBot contém **4 tabelas principais** com um total de **83 registros**:
- **users**: 0 registros (sem usuários cadastrados)
- **properties**: 30 registros (imóveis ativos)
- **chat_messages**: 52 registros (histórico de conversas)
- **conversations**: 1 registro (1 conversa ativa)

## 2. ESTRUTURA DETALHADA DAS TABELAS

### 2.1 Tabela: `users`
**Propósito:** Autenticação de usuários do sistema

**Colunas:**
- `id` (VARCHAR, PK) - UUID gerado automaticamente via `gen_random_uuid()`
- `username` (TEXT, NOT NULL, UNIQUE) - Nome de usuário único
- `password` (TEXT, NOT NULL) - Senha (provavelmente hash)

**Constraints:**
- PRIMARY KEY: `users_pkey` na coluna `id`
- UNIQUE: `users_username_unique` na coluna `username`

**Status:** Tabela vazia (0 registros)

---

### 2.2 Tabela: `properties`
**Propósito:** Catálogo de imóveis disponíveis

**Colunas:**
- `id` (VARCHAR, PK) - UUID gerado automaticamente via `gen_random_uuid()`
- `title` (TEXT, NOT NULL) - Título do imóvel
- `description` (TEXT, NULL) - Descrição detalhada
- `property_type` (TEXT, NOT NULL) - Tipo (casa, apartamento, etc.)
- `state` (TEXT, NOT NULL) - Estado (ex: SP)
- `city` (TEXT, NOT NULL) - Cidade (ex: São Sebastião)
- `neighborhood` (TEXT, NOT NULL) - Bairro
- `address` (TEXT, NULL) - Endereço completo
- `zip_code` (TEXT, NULL) - CEP
- `bedrooms` (INTEGER, NULL) - Número de quartos
- `bathrooms` (INTEGER, NULL) - Número de banheiros
- `parking_spaces` (INTEGER, NULL) - Vagas de garagem
- `area` (INTEGER, NULL) - Área em m²
- `price` (NUMERIC, NOT NULL) - Preço (precisão 12, escala 2)
- `condo_fee` (NUMERIC, NULL) - Taxa de condomínio (precisão 8, escala 2)
- `iptu` (NUMERIC, NULL) - IPTU (precisão 8, escala 2)
- `business_type` (TEXT, NOT NULL) - Tipo de negócio (venda/aluguel)
- `amenities` (ARRAY[TEXT], NULL) - Lista de comodidades
- `main_image` (TEXT, NULL) - URL da imagem principal
- `contact_name` (TEXT, NULL) - Nome do contato
- `contact_phone` (TEXT, NULL) - Telefone do contato
- `contact_email` (TEXT, NULL) - Email do contato
- `embedding` (TEXT, NULL) - Vetor embedding para busca semântica (JSON string)
- `created_at` (TEXT, DEFAULT now()) - Data de criação

**Constraints:**
- PRIMARY KEY: `properties_pkey` na coluna `id`

**Status:** 30 registros ativos

**Amostra de Dados:**
```
ID: d944256f-6427-4da0-a92e-934dfa734660
Título: Casa de Retiro Praia da Baleia
Tipo: casa
Localização: São Sebastião/SP - Praia da Baleia
Quartos: 4, Banheiros: 3, Preço: R$ 1.680.000,00
```

---

### 2.3 Tabela: `chat_messages`
**Propósito:** Histórico individual de mensagens do chat

**Colunas:**
- `id` (VARCHAR, PK) - UUID gerado automaticamente via `gen_random_uuid()`
- `session_id` (TEXT, NOT NULL) - ID da sessão do chat
- `role` (TEXT, NOT NULL) - Papel ('user' ou 'assistant')
- `content` (TEXT, NOT NULL) - Conteúdo da mensagem
- `property_ids` (ARRAY[TEXT], NULL) - IDs dos imóveis referenciados
- `timestamp` (TEXT, DEFAULT now()) - Timestamp da mensagem

**Constraints:**
- PRIMARY KEY: `chat_messages_pkey` na coluna `id`

**Status:** 52 registros (mensagens de chat)

**Amostra de Dados:**
```
Session: b003f600-4a61-4456-8bfc-2e655fa09fe6
Role: assistant
Content: "Aqui estão algumas opções de casas que talvez possam te interessar: 1) Casa de Praia Maresias Vista..."
Property IDs: [fde2b8ad-bb13-4c7f-8c7a-daa40abbb7db, 3bba920d-53eb-46de-ac5c-6bfcc797eeb2, 0ac0b71b-cca6-4be5-9e36-c69f98d401f6]
```

---

### 2.4 Tabela: `conversations`
**Propósito:** Metadados das conversas completas (dados do lead + mensagens completas)

**Colunas:**
- `id` (VARCHAR, PK) - UUID gerado automaticamente via `gen_random_uuid()`
- `session_id` (TEXT, NOT NULL, UNIQUE) - ID único da sessão
- `lead_name` (TEXT, NOT NULL) - Nome do lead/cliente
- `lead_whatsapp` (TEXT, NOT NULL) - WhatsApp do lead
- `privacy_accepted` (BOOLEAN, NOT NULL, DEFAULT true) - Aceitação de privacidade
- `messages` (JSONB, NOT NULL) - Array completo de mensagens da conversa
- `created_at` (TEXT, DEFAULT now()) - Data de criação
- `updated_at` (TEXT, DEFAULT now()) - Data de última atualização

**Constraints:**
- PRIMARY KEY: `conversations_pkey` na coluna `id`
- UNIQUE: `conversations_session_id_unique` na coluna `session_id`

**Status:** 1 registro ativo

**Amostra de Dados:**
```
ID: 186d0627-7b3b-40c8-aebe-ee61f8dc0ef6
Session: 9f4e0031-4ed9-46e8-b826-2d1ff878e5ef
Lead: Gabriel (+55 (12) 97404-1359)
Total Messages: 9 mensagens no JSONB
```

## 3. RELACIONAMENTOS E DEPENDÊNCIAS

### 3.1 Relacionamentos Diretos
- **chat_messages.session_id** ↔ **conversations.session_id** (1:N)
- **chat_messages.property_ids** → **properties.id** (N:M via array)

### 3.2 Relacionamentos Implícitos
- **properties.embedding** - Usado para busca semântica via OpenAI
- **conversations.messages** - Contém dados duplicados de chat_messages (JSONB)

### 3.3 Dependências Funcionais
1. **VectorDB** - Sistema usa embeddings para busca semântica
2. **OpenAI API** - Gera embeddings e respostas do chatbot
3. **WebSocket** - Comunicação em tempo real do chat

## 4. CONFIGURAÇÃO ATUAL DE CONEXÃO

### 4.1 Drizzle Configuration (`drizzle.config.ts`)
```typescript
export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts", 
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
```

### 4.2 Database Connection (`server/db.ts`)
```typescript
const databaseUrl = process.env.DATABASE_URL || process.env.BANCODEDADOS;
export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool, { schema });
```

### 4.3 Environment Variables
- **DATABASE_URL** ✅ Disponível (banco atual)
- **BANCODEDADOS** ✅ Disponível (banco externo de destino)

## 5. VOLUME DE DADOS E STORAGE

### 5.1 Contagem de Registros
| Tabela | Registros | Tamanho Estimado |
|--------|-----------|------------------|
| users | 0 | 0 KB |
| properties | 30 | ~150 KB |
| chat_messages | 52 | ~50 KB |
| conversations | 1 | ~15 KB |
| **TOTAL** | **83** | **~215 KB** |

### 5.2 Dados de Maior Volume
- **properties.embedding** - Strings JSON grandes (vetores de 1536 dimensões)
- **conversations.messages** - Arrays JSONB com conversas completas
- **properties.amenities** - Arrays de texto com comodidades

## 6. ESTRATÉGIA DE MIGRAÇÃO RECOMENDADA

### 6.1 Preparação
1. **Backup completo** do banco atual via pg_dump
2. **Verificar conectividade** com BANCODEDADOS
3. **Testar schema** no banco destino

### 6.2 Ordem de Migração
1. **Estrutura** - Criar tabelas via `npm run db:push`
2. **properties** - Migrar imóveis (incluindo embeddings)
3. **conversations** - Migrar conversas
4. **chat_messages** - Migrar mensagens (validar session_ids)
5. **users** - Tabela vazia (só estrutura)

### 6.3 Pontos de Atenção
- **Embeddings** - Verificar integridade dos vetores JSON
- **UUIDs** - Manter IDs originais para preservar relacionamentos
- **Arrays** - PostgreSQL arrays (amenities, property_ids)
- **JSONB** - Validar estrutura das mensagens

### 6.4 Validação Pós-Migração
- Conferir contagem de registros por tabela
- Testar queries de busca semântica
- Validar relacionamentos chat_messages ↔ conversations
- Testar funcionalidade completa do chatbot

## 7. SCRIPTS SQL PARA MIGRAÇÃO

### 7.1 Verificação de Integridade
```sql
-- Verificar consistência session_ids
SELECT DISTINCT cm.session_id 
FROM chat_messages cm 
LEFT JOIN conversations c ON cm.session_id = c.session_id 
WHERE c.session_id IS NULL;

-- Verificar property_ids válidos
SELECT DISTINCT unnest(property_ids) as prop_id
FROM chat_messages 
WHERE property_ids IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM properties p WHERE p.id = unnest(property_ids)
  );
```

### 7.2 Export de Dados
```sql
-- Export properties com embeddings
COPY (SELECT * FROM properties ORDER BY created_at) TO STDOUT WITH CSV HEADER;

-- Export conversations
COPY (SELECT * FROM conversations ORDER BY created_at) TO STDOUT WITH CSV HEADER;

-- Export chat_messages
COPY (SELECT * FROM chat_messages ORDER BY timestamp) TO STDOUT WITH CSV HEADER;
```

## 8. CONCLUSÕES

✅ **Banco bem estruturado** com 4 tabelas e relacionamentos claros  
✅ **Volume pequeno** (~215 KB) facilita migração rápida  
✅ **Schema Drizzle** permite replicação exata da estrutura  
✅ **BANCODEDADOS secret** disponível para conexão externa  

⚠️ **Atenção especial** para embeddings e arrays PostgreSQL  
⚠️ **Validar** funcionalidade de busca semântica após migração  
⚠️ **Testar** integração completa OpenAI + VectorDB + WebSocket  

**Estimativa de tempo de migração:** 15-30 minutos  
**Risk level:** BAIXO (volume pequeno, estrutura simples)