import { type User, type InsertUser, type Property, type InsertProperty, type ChatMessage, type InsertChatMessage } from "@shared/schema";
import { randomUUID } from "crypto";
import { vectorDB } from "./services/vectordb";
import { generateEmbedding, generatePropertyDescription } from "./services/openai";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createProperty(property: InsertProperty): Promise<Property>;
  getProperty(id: string): Promise<Property | undefined>;
  getAllProperties(): Promise<Property[]>;
  searchProperties(query: string, limit?: number): Promise<Property[]>;
  
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatHistory(sessionId: string): Promise<ChatMessage[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private properties: Map<string, Property>;
  private chatMessages: Map<string, ChatMessage>;

  constructor() {
    this.users = new Map();
    this.properties = new Map();
    this.chatMessages = new Map();
    
    // Initialize with sample properties
    this.initializeSampleData();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const id = randomUUID();
    
    // Generate embedding for the property
    const description = await generatePropertyDescription(insertProperty);
    const embedding = await generateEmbedding(description);
    
    const property: Property = { 
      ...insertProperty,
      id,
      embedding: JSON.stringify(embedding),
      createdAt: new Date().toISOString(),
      description: insertProperty.description ?? null,
      address: insertProperty.address ?? null,
      zipCode: insertProperty.zipCode ?? null,
      bedrooms: insertProperty.bedrooms ?? null,
      bathrooms: insertProperty.bathrooms ?? null,
      parkingSpaces: insertProperty.parkingSpaces ?? null,
      area: insertProperty.area ?? null,
      condoFee: insertProperty.condoFee ?? null,
      iptu: insertProperty.iptu ?? null,
      amenities: insertProperty.amenities ?? null,
      mainImage: insertProperty.mainImage ?? null,
      contactName: insertProperty.contactName ?? null,
      contactPhone: insertProperty.contactPhone ?? null,
      contactEmail: insertProperty.contactEmail ?? null
    };
    
    this.properties.set(id, property);
    
    // Add to vector database
    await vectorDB.addProperty(property);
    
    return property;
  }

  async getProperty(id: string): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async getAllProperties(): Promise<Property[]> {
    return Array.from(this.properties.values());
  }

  async searchProperties(query: string, limit: number = 3): Promise<Property[]> {
    const results = await vectorDB.searchSimilar(query, limit);
    return results.map(({ similarity, ...property }) => property);
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const message: ChatMessage = {
      ...insertMessage,
      id,
      timestamp: new Date().toISOString(),
      propertyIds: insertMessage.propertyIds ?? null
    };
    this.chatMessages.set(id, message);
    return message;
  }

  async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter(message => message.sessionId === sessionId)
      .sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime());
  }

  private async initializeSampleData() {
    const sampleProperties: InsertProperty[] = [
      {
        title: "Apartamento Leblon Vista Mar",
        propertyType: "apartamento",
        description: "Apartamento de luxo com vista mar no Leblon, totalmente reformado com acabamentos de primeira qualidade",
        state: "RJ",
        city: "Rio de Janeiro",
        neighborhood: "Leblon",
        address: "Rua Aristides Espínola, 85",
        zipCode: "22440-050",
        bedrooms: 3,
        bathrooms: 2,
        parkingSpaces: 1,
        area: 140,
        price: "1500000.00",
        condoFee: "800.00",
        iptu: "3500.00",
        businessType: "venda",
        amenities: ["piscina", "academia", "portaria"],
        mainImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3",
        contactName: "Maria Silva",
        contactPhone: "(21) 99999-1234",
        contactEmail: "maria@imobiliaria.com"
      },
      {
        title: "Casa Condomínio Alphaville",
        propertyType: "casa",
        description: "Casa em condomínio fechado com área de lazer completa, 4 quartos sendo 2 suítes",
        state: "SP",
        city: "Barueri",
        neighborhood: "Alphaville",
        address: "Alameda dos Pinheiros, 123",
        zipCode: "06454-000",
        bedrooms: 4,
        bathrooms: 3,
        parkingSpaces: 2,
        area: 300,
        price: "2200000.00",
        condoFee: "1200.00",
        iptu: "5000.00",
        businessType: "venda",
        amenities: ["piscina", "churrasqueira", "jardim", "portaria"],
        mainImage: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?ixlib=rb-4.0.3",
        contactName: "João Santos",
        contactPhone: "(11) 98888-5678",
        contactEmail: "joao@alphaville.com"
      },
      {
        title: "Apartamento Vila Madalena",
        propertyType: "apartamento",
        description: "Apartamento moderno de 2 quartos em prédio novo, próximo ao metrô",
        state: "SP",
        city: "São Paulo",
        neighborhood: "Vila Madalena",
        address: "Rua Harmonia, 456",
        zipCode: "05435-000",
        bedrooms: 2,
        bathrooms: 1,
        parkingSpaces: 1,
        area: 65,
        price: "850000.00",
        condoFee: "450.00",
        iptu: "1800.00",
        businessType: "venda",
        amenities: ["elevador", "portaria"],
        mainImage: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3",
        contactName: "Ana Costa",
        contactPhone: "(11) 97777-9999",
        contactEmail: "ana@vmadalena.com"
      },
      {
        title: "Cobertura Ipanema",
        propertyType: "cobertura",
        description: "Cobertura duplex com terraço privativo e vista para o mar de Ipanema",
        state: "RJ",
        city: "Rio de Janeiro",
        neighborhood: "Ipanema",
        address: "Rua Visconde de Pirajá, 789",
        zipCode: "22410-000",
        bedrooms: 4,
        bathrooms: 4,
        parkingSpaces: 2,
        area: 250,
        price: "3500000.00",
        condoFee: "1500.00",
        iptu: "8000.00",
        businessType: "venda",
        amenities: ["piscina", "academia", "churrasqueira", "portaria"],
        mainImage: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3",
        contactName: "Carlos Oliveira",
        contactPhone: "(21) 96666-4321",
        contactEmail: "carlos@ipanema.com"
      },
      {
        title: "Studio Centro São Paulo",
        propertyType: "studio",
        description: "Studio compacto e funcional no centro histórico de São Paulo",
        state: "SP",
        city: "São Paulo",
        neighborhood: "Centro",
        address: "Rua Boa Vista, 321",
        zipCode: "01014-000",
        bedrooms: 0,
        bathrooms: 1,
        parkingSpaces: 0,
        area: 35,
        price: "320000.00",
        condoFee: "280.00",
        iptu: "800.00",
        businessType: "venda",
        amenities: ["elevador"],
        mainImage: "https://images.unsplash.com/photo-1586105251261-72a756497a11?ixlib=rb-4.0.3",
        contactName: "Pedro Lima",
        contactPhone: "(11) 95555-1111",
        contactEmail: "pedro@centro.com"
      },
      {
        title: "Casa Barra da Tijuca",
        propertyType: "casa",
        description: "Casa térrea com quintal amplo e piscina na Barra da Tijuca",
        state: "RJ",
        city: "Rio de Janeiro",
        neighborhood: "Barra da Tijuca",
        address: "Estrada dos Bandeirantes, 654",
        zipCode: "22785-000",
        bedrooms: 3,
        bathrooms: 2,
        parkingSpaces: 2,
        area: 180,
        price: "1200000.00",
        condoFee: "600.00",
        iptu: "3000.00",
        businessType: "venda",
        amenities: ["piscina", "churrasqueira", "jardim"],
        mainImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3",
        contactName: "Lucia Ferreira",
        contactPhone: "(21) 94444-2222",
        contactEmail: "lucia@barra.com"
      },
      {
        title: "Apartamento Jardins",
        propertyType: "apartamento",
        description: "Apartamento elegante nos Jardins com 3 suítes e varanda gourmet",
        state: "SP",
        city: "São Paulo",
        neighborhood: "Jardins",
        address: "Rua Augusta, 987",
        zipCode: "01305-000",
        bedrooms: 3,
        bathrooms: 3,
        parkingSpaces: 2,
        area: 120,
        price: "1800000.00",
        condoFee: "900.00",
        iptu: "4200.00",
        businessType: "venda",
        amenities: ["piscina", "academia", "elevador", "portaria"],
        mainImage: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3",
        contactName: "Roberto Silva",
        contactPhone: "(11) 93333-7777",
        contactEmail: "roberto@jardins.com"
      },
      {
        title: "Loft Vila Olímpia",
        propertyType: "loft",
        description: "Loft industrial reformado na Vila Olímpia com pé direito duplo",
        state: "SP",
        city: "São Paulo",
        neighborhood: "Vila Olímpia",
        address: "Rua Gomes de Carvalho, 159",
        zipCode: "04547-000",
        bedrooms: 1,
        bathrooms: 1,
        parkingSpaces: 1,
        area: 80,
        price: "950000.00",
        condoFee: "550.00",
        iptu: "2100.00",
        businessType: "venda",
        amenities: ["elevador", "portaria"],
        mainImage: "https://images.unsplash.com/photo-1555636222-cae831e670b3?ixlib=rb-4.0.3",
        contactName: "Fernanda Costa",
        contactPhone: "(11) 92222-8888",
        contactEmail: "fernanda@olimpia.com"
      },
      {
        title: "Apartamento Copacabana",
        propertyType: "apartamento",
        description: "Apartamento clássico em Copacabana com vista lateral para o mar",
        state: "RJ",
        city: "Rio de Janeiro",
        neighborhood: "Copacabana",
        address: "Avenida Atlântica, 1200",
        zipCode: "22021-000",
        bedrooms: 2,
        bathrooms: 1,
        parkingSpaces: 0,
        area: 85,
        price: "980000.00",
        condoFee: "650.00",
        iptu: "2800.00",
        businessType: "venda",
        amenities: ["portaria"],
        mainImage: "https://images.unsplash.com/photo-1551845041-63e8e76836ad?ixlib=rb-4.0.3",
        contactName: "Marcos Pereira",
        contactPhone: "(21) 91111-3333",
        contactEmail: "marcos@copacabana.com"
      },
      {
        title: "Casa Condomínio Granja Viana",
        propertyType: "casa",
        description: "Casa de alto padrão em condomínio fechado na Granja Viana",
        state: "SP",
        city: "Cotia",
        neighborhood: "Granja Viana",
        address: "Rua das Palmeiras, 876",
        zipCode: "06709-000",
        bedrooms: 5,
        bathrooms: 4,
        parkingSpaces: 3,
        area: 400,
        price: "2800000.00",
        condoFee: "1800.00",
        iptu: "7500.00",
        businessType: "venda",
        amenities: ["piscina", "academia", "churrasqueira", "jardim", "portaria"],
        mainImage: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3",
        contactName: "Sandra Martins",
        contactPhone: "(11) 90000-5555",
        contactEmail: "sandra@granja.com"
      }
    ];

    // Add all sample properties to storage and vector database
    for (const propertyData of sampleProperties) {
      try {
        await this.createProperty(propertyData);
        console.log(`Initialized sample property: ${propertyData.title}`);
      } catch (error) {
        console.error(`Error initializing property ${propertyData.title}:`, error);
      }
    }
    
    console.log(`Initialized ${sampleProperties.length} sample properties`);
  }
}

export const storage = new MemStorage();
