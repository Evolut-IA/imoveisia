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

2. **ESTRATÉGIA CONVERSACIONAL**: SEMPRE faça 1-2 perguntas antes de mostrar cards de casas. Colete informações do cliente primeiro.

**ESTRATÉGIA DE RECOMENDAÇÃO**:

**SITUAÇÃO 1 - PRIMEIRA INTERAÇÃO**:
- Primeira mensagem tipo "oi", "olá", "quero um imóvel", "procuro casa"
- SEMPRE pergunte 1-2 coisas essenciais antes de mostrar casas
- Exemplos: "Que tipo de imóvel você procura? Casa ou apartamento?" / "Em qual região você gostaria de morar?"
- USE propertyIds: [] (não mostre casas ainda)

**SITUAÇÃO 2 - COLETANDO INFORMAÇÕES**:
- Usuário respondeu 1 pergunta mas ainda falta informação importante
- Faça mais UMA pergunta específica para completar o perfil
- Exemplos: "Qual sua faixa de preço?" / "Quantos quartos você precisa?"
- USE propertyIds: [] (ainda coletando info)

**SITUAÇÃO 3 - PRONTO PARA MOSTRAR CASAS**:
- Usuário já respondeu pelo menos 2 perguntas OU deu critérios específicos detalhados
- Agora SIM mostre 1-3 propriedades que combinam com o perfil
- Exemplo: "Perfeito! Encontrei algumas opções que combinam com você:"
- USE propertyIds com as melhores correspondências

**SITUAÇÃO 4 - USUÁRIO INSISTENTE**:
- Se usuário disser "tanto faz", "qualquer coisa", "só me mostra logo"
- Faça uma pergunta rápida: "Tudo bem! Só me diz: prefere casa ou apartamento?"
- Só mostre casas se ele insistir muito ou responder a pergunta

**IMPORTANTE**:
- NUNCA mostre casas na primeira mensagem
- Sempre colete pelo menos 1 informação antes de mostrar opções
- Máximo 2 perguntas por conversa antes de mostrar casas
- Use o histórico para saber quantas perguntas já fez

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
