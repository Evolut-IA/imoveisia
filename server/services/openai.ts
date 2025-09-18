import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || (() => {
    throw new Error("OPENAI_API_KEY environment variable is required");
  })()
});

export interface PropertyRecommendation {
  reasoning: string;
  propertyIds: string[];
  responseMessage: string;
}

export async function generateChatResponse(
  userMessage: string, 
  chatHistory: Array<{role: string, content: string}>,
  availableProperties: Array<{id: string, title: string, description: string, price: number, city: string, neighborhood: string}>,
  recentlyRecommendedIds: string[] = []
): Promise<PropertyRecommendation> {
  try {
    // Filter out recently recommended properties to avoid duplicates
    const filteredProperties = availableProperties.filter(
      prop => !recentlyRecommendedIds.includes(prop.id)
    );

    const systemPrompt = `Você é o CasaBot, um assistente imobiliário inteligente e humanizado que ajuda pessoas a encontrar casas ideais.

REGRAS FUNDAMENTAIS:

1. **LIMITE DE CARACTERES**: Suas respostas devem ter SEMPRE entre 100 e 500 caracteres. Seja conciso e direto.

2. **SEJA FLEXÍVEL E ÚTIL**: Se o usuário não quiser dar muitos detalhes, mostre 1-3 opções baseadas no que você tem disponível.

**ESTRATÉGIA DE RECOMENDAÇÃO**:

**SITUAÇÃO 1 - USUÁRIO VAGO/NÃO QUER DETALHAR**:
- Se o usuário diz coisas como "tanto faz", "pode ser qualquer", "me mostre opções", "não sei", "qualquer coisa serve"
- SEMPRE MOSTRE 1-3 propriedades diversas (diferentes preços/locais/tipos)
- Exemplo: "Aqui estão algumas opções interessantes que tenho disponíveis!"
- USE propertyIds com 1-3 propriedades

**SITUAÇÃO 2 - USUÁRIO ESPECÍFICO**:
- Se o usuário menciona critérios específicos (local, tipo, preço, quartos)
- MOSTRE propriedades que mais se aproximam desses critérios
- Se não tiver exato, mostre similares: "Não tenho exatamente isso, mas veja estas opções similares"
- USE propertyIds com as melhores correspondências (1-3 propriedades)

**SITUAÇÃO 3 - CONVERSAÇÃO INICIAL**:
- Primeira mensagem genérica tipo "oi", "olá", "quero um imóvel"
- Se for primeira mensagem vaga, pode perguntar brevemente OU já mostrar opções
- Se o usuário já mostrou resistência ou parece impaciente, pule perguntas e mostre opções
- REGRA: Na dúvida, sempre prefira mostrar opções

**IMPORTANTE**:
- Se o usuário mencionou QUALQUER critério (mesmo só 1), já pode mostrar opções
- Não insista em perguntas se o usuário não quer detalhar
- SEMPRE prefira mostrar algo do que não mostrar nada
- Se estiver na dúvida entre perguntar mais ou mostrar opções, MOSTRE OPÇÕES
- Mesmo sem parâmetros específicos, pode mostrar 1-3 casas diversas
- Use o contexto da conversa para escolher as melhores opções

**CONVERSAÇÃO SOCIAL**:
- Apenas para "obrigado", "tchau", "até logo"
- USE SEMPRE propertyIds: []

PROPRIEDADES DISPONÍVEIS${recentlyRecommendedIds.length > 0 ? ' (excluindo propriedades já recomendadas recentemente)' : ''}:
${filteredProperties.length > 0 ? filteredProperties.map(p => `ID: ${p.id} | ${p.title} | ${p.city}, ${p.neighborhood} | R$ ${p.price.toLocaleString('pt-BR')} | ${p.description}`).join('\n') : 'NENHUMA PROPRIEDADE DISPONÍVEL NO MOMENTO - Informe ao usuário que não temos propriedades para mostrar agora.'}

Responda SEMPRE em JSON com:
{
  "reasoning": "Explicação da análise - se é busca por propriedades ou conversação social",
  "propertyIds": ["id1", "id2", "id3"] ou [] para conversação social,
  "responseMessage": "Mensagem amigável para o usuário"
}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...chatHistory,
      { role: "user", content: userMessage }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages as any,
      response_format: { type: "json_object" },
      max_completion_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      reasoning: result.reasoning || "Análise das preferências do usuário",
      propertyIds: result.propertyIds || [],
      responseMessage: result.responseMessage || "Desculpe, não consegui processar sua solicitação adequadamente."
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    
    // Return a fallback response instead of throwing
    return {
      reasoning: "Erro ao processar solicitação",
      propertyIds: [],
      responseMessage: "Desculpe, não consegui processar sua solicitação adequadamente. Por favor, tente novamente."
    };
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("OpenAI embedding error:", error);
    throw new Error("Falha ao gerar embedding: " + (error instanceof Error ? error.message : String(error)));
  }
}

export async function generatePropertyDescription(property: any): Promise<string> {
  const propertyText = `
    Título: ${property.title}
    Tipo: ${property.propertyType}
    Descrição: ${property.description || ''}
    Localização: ${property.neighborhood}, ${property.city}, ${property.state}
    Quartos: ${property.bedrooms || 0}
    Banheiros: ${property.bathrooms || 0}
    Área: ${property.area || 0}m²
    Preço: R$ ${property.price}
    Tipo de negócio: ${property.businessType}
    Comodidades: ${property.amenities?.join(', ') || 'Nenhuma'}
  `.trim();

  return propertyText;
}

export interface MessageChunk {
  content: string;
  isLast: boolean;
  delay: number;
}

export function splitMessageIntoChunks(message: string): MessageChunk[] {
  // Para mensagens curtas (até 400 caracteres), retorna como um chunk único
  if (message.length <= 400) {
    return [{
      content: message,
      isLast: true,
      delay: Math.floor(Math.random() * 2000) + 1000 // 1-3 segundos
    }];
  }

  const chunks: MessageChunk[] = [];
  const sentences = message.split(/[.!?]\s+/).filter(s => s.trim().length > 0);
  let currentChunk = '';
  
  for (let i = 0; i < sentences.length; i++) {
    let sentence = sentences[i].trim();
    
    // Adiciona pontuação apenas se não for a última frase
    if (i < sentences.length - 1) {
      sentence += '. ';
    }
    
    // Aumenta limite para 500 caracteres para evitar cortar frases
    if (currentChunk.length + sentence.length <= 500) {
      currentChunk += sentence;
    } else {
      // Se o chunk atual tem pelo menos 150 caracteres, salva ele
      if (currentChunk.trim() && currentChunk.length >= 150) {
        chunks.push({
          content: currentChunk.trim(),
          isLast: false,
          delay: Math.floor(Math.random() * 2000) + 1000 // 1-3 segundos
        });
        currentChunk = sentence;
      } else {
        // Se o chunk é muito pequeno, continua adicionando
        currentChunk += sentence;
      }
    }
  }
  
  // Adiciona o último chunk se houver conteúdo
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      isLast: true,
      delay: Math.floor(Math.random() * 2000) + 1000 // 1-3 segundos
    });
  }
  
  // Se não criou chunks ou só criou um chunk muito pequeno, força divisão por palavras mais inteligente
  if (chunks.length === 0 || (chunks.length === 1 && chunks[0].content.length > 500)) {
    const words = message.split(' ').filter(w => w.trim().length > 0);
    const newChunks: MessageChunk[] = [];
    let currentChunk = '';
    
    for (const word of words) {
      // Usa limite de 500 caracteres para palavras também
      if (currentChunk.length + word.length + 1 <= 500) {
        currentChunk += (currentChunk ? ' ' : '') + word;
      } else {
        if (currentChunk.trim() && currentChunk.length >= 100) {
          newChunks.push({
            content: currentChunk.trim(),
            isLast: false,
            delay: Math.floor(Math.random() * 2000) + 1000
          });
          currentChunk = word;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + word;
        }
      }
    }
    
    if (currentChunk.trim()) {
      newChunks.push({
        content: currentChunk.trim(),
        isLast: true,
        delay: Math.floor(Math.random() * 2000) + 1000
      });
    }
    
    // Se conseguiu criar chunks melhores, usa eles
    if (newChunks.length > 0) {
      return newChunks;
    }
  }
  
  // Marca o último chunk
  if (chunks.length > 0) {
    chunks[chunks.length - 1].isLast = true;
  }
  
  return chunks;
}
