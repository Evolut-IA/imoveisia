import { Property } from "@shared/schema";
import { generateEmbedding, generatePropertyDescription } from "./openai";

export interface PropertyWithSimilarity extends Property {
  similarity: number;
}

export class VectorDatabase {
  private properties: Array<Property & { embeddingVector?: number[] }> = [];

  async addProperty(property: Property): Promise<void> {
    try {
      // Generate text description for embedding
      const description = await generatePropertyDescription(property);
      
      // Generate embedding
      const embedding = await generateEmbedding(description);
      
      // Parse existing embedding if it exists, otherwise use new one
      const embeddingVector = property.embedding ? 
        JSON.parse(property.embedding) : embedding;
      
      // Store property with embedding vector
      this.properties.push({
        ...property,
        embeddingVector
      });
      
      console.log(`Added property "${property.title}" to vector database`);
    } catch (error) {
      console.error("Error adding property to vector database:", error);
      throw error;
    }
  }

  async searchSimilar(query: string, limit: number = 3): Promise<PropertyWithSimilarity[]> {
    try {
      if (this.properties.length === 0) {
        return [];
      }

      // Generate embedding for search query
      const queryEmbedding = await generateEmbedding(query);
      
      // Calculate similarities
      const propertiesWithSimilarity = this.properties.map(property => {
        const similarity = this.cosineSimilarity(
          queryEmbedding, 
          property.embeddingVector || []
        );
        
        return {
          ...property,
          similarity
        };
      });

      // Sort by similarity and return top results
      const sortedProperties = propertiesWithSimilarity
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return sortedProperties;
    } catch (error) {
      console.error("Error searching vector database:", error);
      throw error;
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  getAllProperties(): Property[] {
    return this.properties.map(({ embeddingVector, ...property }) => property);
  }

  getPropertyById(id: string): Property | undefined {
    const found = this.properties.find(p => p.id === id);
    if (found) {
      const { embeddingVector, ...property } = found;
      return property;
    }
    return undefined;
  }
}

export const vectorDB = new VectorDatabase();
