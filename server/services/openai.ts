import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "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" 
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
- Se o usuário diz coisas como "tanto faz", "pode ser qualquer", "me mostre opções"
- MOSTRE 1-3 propriedades diversas (diferentes preços/locais/tipos)
- Exemplo: "Aqui estão algumas opções interessantes que tenho disponíveis!"
- USE propertyIds com 1-3 propriedades

**SITUAÇÃO 2 - USUÁRIO ESPECÍFICO**:
- Se o usuário menciona critérios específicos (local, tipo, preço, quartos)
- MOSTRE propriedades que mais se aproximam desses critérios
- Se não tiver exato, mostre similares: "Não tenho exatamente isso, mas veja estas opções similares"
- USE propertyIds com as melhores correspondências

**SITUAÇÃO 3 - CONVERSAÇÃO INICIAL**:
- Primeira mensagem genérica tipo "oi", "olá", "quero um imóvel"
- Pergunte sobre preferências mas seja breve
- Se o usuário resistir a dar detalhes, mostre opções na próxima mensagem
- USE propertyIds: [] apenas na primeira interação

**IMPORTANTE**:
- Se o usuário mencionou QUALQUER critério (mesmo só 1), já pode mostrar opções
- Não insista em perguntas se o usuário não quer detalhar
- Sempre prefira mostrar algo do que não mostrar nada
- Use o contexto da conversa para escolher as melhores opções

**CONVERSAÇÃO SOCIAL**:
- Apenas para "obrigado", "tchau", "até logo"
- USE SEMPRE propertyIds: []

PROPRIEDADES DISPONÍVEIS${recentlyRecommendedIds.length > 0 ? ' (excluindo propriedades já recomendadas recentemente)' : ''}:
${filteredProperties.map(p => `ID: ${p.id} | ${p.title} | ${p.city}, ${p.neighborhood} | R$ ${p.price.toLocaleString('pt-BR')} | ${p.description}`).join('\n')}

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
  // Se a mensagem for muito curta, retorna como um chunk único
  if (message.length <= 150) {
    return [{
      content: message,
      isLast: true,
      delay: Math.floor(Math.random() * 3000) + 1000 // 1-4 segundos
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
    
    // Se adicionar esta frase não ultrapassar 200 caracteres, adiciona ao chunk atual
    if (currentChunk.length + sentence.length <= 200) {
      currentChunk += sentence;
    } else {
      // Se o chunk atual não estiver vazio, salva ele
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          isLast: false,
          delay: Math.floor(Math.random() * 3000) + 1000 // 1-4 segundos
        });
      }
      
      // Inicia um novo chunk com a frase atual
      currentChunk = sentence;
    }
  }
  
  // Adiciona o último chunk se houver conteúdo
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      isLast: true,
      delay: Math.floor(Math.random() * 3000) + 1000 // 1-4 segundos
    });
  }
  
  // Se não criou chunks (mensagem muito longa sem pontuação), força divisão por caracteres
  if (chunks.length === 0) {
    const words = message.split(' ').filter(w => w.trim().length > 0);
    let currentChunk = '';
    
    for (const word of words) {
      if (currentChunk.length + word.length + 1 <= 200) {
        currentChunk += (currentChunk ? ' ' : '') + word;
      } else {
        if (currentChunk.trim()) {
          chunks.push({
            content: currentChunk.trim(),
            isLast: false,
            delay: Math.floor(Math.random() * 3000) + 1000
          });
        }
        currentChunk = word;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        isLast: true,
        delay: Math.floor(Math.random() * 3000) + 1000
      });
    }
  }
  
  // Marca o último chunk
  if (chunks.length > 0) {
    chunks[chunks.length - 1].isLast = true;
  }
  
  return chunks;
}
