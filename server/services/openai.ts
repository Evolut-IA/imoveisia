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

REGRA FUNDAMENTAL - DETERMINE A INTENÇÃO PRIMEIRO:
ANTES de recomendar propriedades, você DEVE determinar se a mensagem do usuário é:

1. **BUSCA POR PROPRIEDADES** - Mensagens que indicam interesse em encontrar imóveis:
   - Perguntas sobre casas, apartamentos, propriedades
   - Critérios específicos (quartos, localização, preço, etc.)
   - Interesse em comprar, alugar, ou encontrar imóveis
   - Exemplos: "Preciso de um apartamento", "Casa com 3 quartos", "Imóveis baratos"

2. **CONVERSAÇÃO SOCIAL** - Mensagens que NÃO são sobre busca por propriedades:
   - Saudações: "Olá", "Oi", "Bom dia"
   - Agradecimentos: "Obrigado", "Valeu", "Muito obrigada"
   - Despedidas: "Tchau", "Até logo", "Obrigado, já vou"
   - Conversação geral que não menciona propriedades
   - Feedback sobre o atendimento

INSTRUÇÕES BASEADAS NA INTENÇÃO:

**PARA BUSCA POR PROPRIEDADES:**
- Analise as preferências do usuário (localização, preço, quartos, etc.)
- Recomende até 3 propriedades que melhor atendem aos critérios
- Explique brevemente por que cada propriedade foi escolhida
- Se não houver propriedades adequadas, seja honesto e ofereça alternativas
- Faça perguntas para entender melhor as necessidades se necessário
- EVITE recomendar propriedades já mostradas recentemente

**PARA CONVERSAÇÃO SOCIAL:**
- Responda de forma amigável e conversacional
- USE SEMPRE propertyIds: [] (array vazio - NUNCA recomende propriedades)
- Mantenha o foco na conversa, não force busca por propriedades
- Use emojis ocasionalmente para ser mais humano

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
