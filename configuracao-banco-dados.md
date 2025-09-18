# Configurações Avançadas do Sistema

## Visão Geral
Este projeto utiliza uma arquitetura avançada com **Vector Database**, **OpenAI Embeddings**, **WebSocket em tempo real**, e **Drizzle ORM** para criar uma plataforma imobiliária inteligente com busca semântica.

## Tecnologias e Configurações Especializadas

### 1. Vector Database (Busca Semântica)
- **Implementação Customizada** - Sistema próprio de busca vetorial
- **OpenAI Embeddings** - `text-embedding-3-small` para vetorização
- **Similaridade Coseno** - Algoritmo de cálculo de relevância
- **Armazenamento Híbrido** - Vetores em memória + dados persistentes

### 2. OpenAI Integration
- **Modelo Principal** - `gpt-4o` para conversas inteligentes
- **Embedding Model** - `text-embedding-3-small` para vetorização
- **Chat Estruturado** - Respostas em JSON com reasoning
- **Chunking Inteligente** - Sistema de divisão de mensagens longas

### 3. WebSocket Real-time
- **Protocolo** - WebSocket Server na rota `/ws`
- **Sessões de Chat** - Gerenciamento de múltiplas conversas simultâneas
- **Streaming** - Mensagens em tempo real com delays simulados

### 4. Drizzle ORM Avançado
- **Type Safety** - Schemas TypeScript com validação Zod
- **Schema Migration** - Push direto sem SQL manual
- **Relacionamentos** - Estrutura relacional otimizada para busca

## Configuração Vector Database

### Implementação (`server/services/vectordb.ts`)
```typescript
export class VectorDatabase {
  private properties: Array<Property & { embeddingVector?: number[] }> = [];

  async addProperty(property: Property): Promise<void> {
    // Gera descrição textual para embedding
    const description = await generatePropertyDescription(property);
    
    // Gera embedding via OpenAI
    const embedding = await generateEmbedding(description);
    
    // Armazena propriedade com vetor
    this.properties.push({
      ...property,
      embeddingVector: embedding
    });
  }

  async searchSimilar(query: string, limit: number = 3): Promise<PropertyWithSimilarity[]> {
    // Gera embedding da query
    const queryEmbedding = await generateEmbedding(query);
    
    // Calcula similaridade coseno
    const propertiesWithSimilarity = this.properties.map(property => ({
      ...property,
      similarity: this.cosineSimilarity(queryEmbedding, property.embeddingVector || [])
    }));

    // Retorna ordenado por relevância
    return propertiesWithSimilarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }
}
```

### Algoritmo de Similaridade Coseno
```typescript
private cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

## Configuração OpenAI

### Sistema de Chat Inteligente (`server/services/openai.ts`)
```typescript
// Configuração do cliente OpenAI
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

// Geração de embeddings para busca vetorial
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

// Chat conversacional com estruturação JSON
export async function generateChatResponse(
  userMessage: string, 
  chatHistory: Array<{role: string, content: string}>,
  availableProperties: Array<Property>,
  recentlyRecommendedIds: string[] = []
): Promise<PropertyRecommendation> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [systemPrompt, ...chatHistory, userMessage],
    response_format: { type: "json_object" },
    max_completion_tokens: 1000,
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### Estratégias de Conversação
- **Coleta Progressiva** - Perguntas estratégicas antes de mostrar propriedades
- **Personalização Contextual** - Uso inteligente do nome do usuário
- **Resposta Estruturada** - JSON com `reasoning`, `propertyIds`, `responseMessage`
- **Limite de Caracteres** - 100-500 caracteres para otimização móvel

## Configuração WebSocket Real-time

### Servidor WebSocket (`server/routes.ts`)
```typescript
// Servidor WebSocket na rota /ws
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
const chatSessions = new Map<string, ChatSession>();

// Gerenciamento de sessões em tempo real
wss.on('connection', (ws) => {
  const sessionId = generateSessionId();
  chatSessions.set(sessionId, new ChatSession(ws, sessionId));
  
  ws.on('message', async (data) => {
    const session = chatSessions.get(sessionId);
    await session.handleMessage(JSON.parse(data.toString()));
  });
});
```

### Funcionalidades Real-time
- **Múltiplas Sessões** - Suporte simultâneo para vários usuários
- **Streaming de Mensagens** - Chunking inteligente de respostas longas
- **Delays Simulados** - 1-3 segundos para simular digitação humana
- **Estado Persistente** - Manutenção do histórico durante a sessão

## Configuração Dual Storage

### Interface Abstrata (`server/storage.ts`)
```typescript
export interface IStorage {
  // Propriedades com busca vetorial
  createProperty(property: InsertProperty): Promise<Property>;
  searchProperties(query: string, limit?: number): Promise<Property[]>;
  
  // Chat em tempo real
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatHistory(sessionId: string): Promise<ChatMessage[]>;
  
  // Conversas persistentes
  saveConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(sessionId: string, messages: any[]): Promise<number>;
}
```

### Implementações
- **DatabaseStorage** - PostgreSQL com Drizzle ORM
- **MemStorage** - Em memória com dados de exemplo pré-carregados

## Schema de Busca Vetorial

### Tabela Properties (Otimizada para IA)
```typescript
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  
  // Campos de busca semântica
  embedding: text("embedding"), // JSON string do vetor
  description: text("description"),
  
  // Localização estruturada
  state: text("state").notNull(),
  city: text("city").notNull(),
  neighborhood: text("neighborhood").notNull(),
  
  // Dados numericos para filtros
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  area: integer("area"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  
  // Arrays para busca avançada
  amenities: text("amenities").array(),
});
```

## Funcionalidades de IA Avançadas

### 1. **Geração Automática de Descrições**
- Combina dados estruturados em texto para embedding
- Inclui localização, características, preço e comodidades
- Otimizado para busca semântica em português

### 2. **Chunking Inteligente de Mensagens**
- Divisão por frases (pontuação)
- Limite de 500 caracteres por chunk
- Fallback para divisão por palavras
- Delays simulados de 1-3 segundos

### 3. **Recomendação Contextual**
- Análise de histórico de conversa
- Filtro de propriedades já recomendadas
- Personalização baseada em preferências expressas

### 4. **Busca Semântica Multilíngue**
- Embeddings `text-embedding-3-small` (1536 dimensões)
- Similaridade coseno para relevância
- Suporte a consultas em linguagem natural

## Variáveis de Ambiente Especializadas

### OpenAI
- `OPENAI_API_KEY` - Chave da API OpenAI (obrigatório)

### Banco de Dados
- `DATABASE_URL` - Conexão PostgreSQL (obrigatório)

### Configurações Opcionais
- `NODE_ENV` - Ambiente de execução
- `PORT` - Porta do servidor (padrão: 5000)

## Comandos de Desenvolvimento

### Gerenciamento de Schema
```bash
npm run db:push          # Sincronização segura
npm run db:push --force  # Forçar com perda de dados
```

### Execução do Sistema
```bash
npm run dev              # Desenvolvimento com hot-reload
npm start                # Produção
```

## Monitoramento e Performance

### Logs Especializados
- `🗄️ Storage: DatabaseStorage active` - Confirmação do storage ativo
- `Added property "X" to vector database` - Indexação vetorial
- `Error adding property to vector database` - Falhas de embedding

### Métricas de Performance
- Tempo de geração de embeddings (~100-500ms)
- Latência de busca vetorial (~50-200ms)
- Throughput de WebSocket (múltiplas sessões simultâneas)

---

*Documentação Técnica - Versão 2.0*  
*Sistema: Plataforma Imobiliária com IA Avançada*  
*Atualizado em: 18 de setembro de 2025*