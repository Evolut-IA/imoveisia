import { type User, type InsertUser, type Property, type InsertProperty, type ChatMessage, type InsertChatMessage, type Conversation, type InsertConversation } from "@shared/schema";
import { randomUUID } from "crypto";
import { vectorDB } from "./services/vectordb";
import { generateEmbedding, generatePropertyDescription } from "./services/openai";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { users, properties, chatMessages, conversations } from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createProperty(property: InsertProperty): Promise<Property>;
  getProperty(id: string): Promise<Property | undefined>;
  getAllProperties(): Promise<Property[]>;
  searchProperties(query: string, limit?: number): Promise<Property[]>;
  clearProperties(): Promise<void>;
  
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatHistory(sessionId: string): Promise<ChatMessage[]>;
  
  saveConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(sessionId: string, messages: any[]): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private properties: Map<string, Property>;
  private chatMessages: Map<string, ChatMessage>;
  private conversations: Map<string, Conversation>;

  constructor() {
    this.users = new Map();
    this.properties = new Map();
    this.chatMessages = new Map();
    this.conversations = new Map();
    
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

  async clearProperties(): Promise<void> {
    this.properties.clear();
    vectorDB.clearProperties();
    console.log("Cleared all properties from storage and vector database");
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

  async saveConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const conversation: Conversation = {
      ...insertConversation,
      id,
      privacyAccepted: insertConversation.privacyAccepted ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(sessionId: string, messages: any[]): Promise<void> {
    const conversation = Array.from(this.conversations.values())
      .find(conv => conv.sessionId === sessionId);
    
    if (conversation) {
      conversation.messages = messages;
      conversation.updatedAt = new Date().toISOString();
      this.conversations.set(conversation.id, conversation);
    }
  }

  private async initializeSampleData() {
    // Clear existing properties before loading new ones
    await this.clearProperties();

    const sampleProperties: InsertProperty[] = [
      // Maresias - 2 properties
      {
        title: "Casa de Praia Maresias Vista Mar",
        propertyType: "casa",
        description: "Casa de praia em Maresias com vista direta para o mar, ideal para relaxar e curtir as famosas ondas desta praia badalada. Local perfeito para surfistas e amantes da vida noturna.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Maresias",
        address: "Rua das Ondas, 123",
        zipCode: "11600-000",
        bedrooms: 4,
        bathrooms: 3,
        parkingSpaces: 2,
        area: 250,
        price: "2800000.00",
        condoFee: "0.00",
        iptu: "4200.00",
        businessType: "venda",
        amenities: ["vista-mar", "churrasqueira", "jardim", "piscina"],
        mainImage: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3",
        contactName: "Carlos Martins",
        contactPhone: "(12) 99999-1111",
        contactEmail: "carlos@maresias.com"
      },
      {
        title: "Apartamento Maresias Centro",
        propertyType: "apartamento",
        description: "Apartamento moderno no centro de Maresias, próximo às famosas barracas de praia e vida noturna agitada. Ótimo investimento para temporada.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Maresias",
        address: "Avenida Dr. Francisco Loup, 456",
        zipCode: "11600-000",
        bedrooms: 2,
        bathrooms: 2,
        parkingSpaces: 1,
        area: 85,
        price: "950000.00",
        condoFee: "450.00",
        iptu: "1800.00",
        businessType: "venda",
        amenities: ["portaria", "elevador", "salao-festas"],
        mainImage: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3",
        contactName: "Ana Rodrigues",
        contactPhone: "(12) 98888-2222",
        contactEmail: "ana@maresias.com"
      },
      // Juquehy - 2 properties
      {
        title: "Casa Luxo Juquehy Frente Mar",
        propertyType: "casa",
        description: "Casa de alto padrão na famosa praia de Juquehy, conhecida por suas águas cristalinas e atmosfera familiar. Perfeita para quem busca tranquilidade sem abrir mão do luxo.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Juquehy",
        address: "Rua da Praia, 78",
        zipCode: "11600-000",
        bedrooms: 5,
        bathrooms: 4,
        parkingSpaces: 3,
        area: 350,
        price: "3500000.00",
        condoFee: "0.00",
        iptu: "5200.00",
        businessType: "venda",
        amenities: ["vista-mar", "piscina", "churrasqueira", "jardim", "hidromassagem"],
        mainImage: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3",
        contactName: "Marina Costa",
        contactPhone: "(12) 97777-3333",
        contactEmail: "marina@juquehy.com"
      },
      {
        title: "Apartamento Juquehy com Varanda",
        propertyType: "apartamento",
        description: "Apartamento aconchegante em Juquehy com varanda gourmet, ideal para famílias que procuram paz e sossego em uma das praias mais bonitas do litoral norte.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Juquehy",
        address: "Avenida Mãe Bernarda, 234",
        zipCode: "11600-000",
        bedrooms: 3,
        bathrooms: 2,
        parkingSpaces: 2,
        area: 120,
        price: "1200000.00",
        condoFee: "380.00",
        iptu: "2100.00",
        businessType: "venda",
        amenities: ["portaria", "piscina", "playground", "salao-festas"],
        mainImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3",
        contactName: "Roberto Silva",
        contactPhone: "(12) 96666-4444",
        contactEmail: "roberto@juquehy.com"
      },
      // Boiçucanga - 2 properties
      {
        title: "Casa Família Boiçucanga",
        propertyType: "casa",
        description: "Casa espaçosa em Boiçucanga, praia conhecida pela tranquilidade e beleza natural preservada. Excelente para famílias com crianças e quem aprecia a natureza.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Boiçucanga",
        address: "Rua das Estrelas do Mar, 156",
        zipCode: "11600-000",
        bedrooms: 4,
        bathrooms: 3,
        parkingSpaces: 2,
        area: 200,
        price: "1800000.00",
        condoFee: "0.00",
        iptu: "3000.00",
        businessType: "venda",
        amenities: ["jardim", "churrasqueira", "piscina", "area-gourmet"],
        mainImage: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?ixlib=rb-4.0.3",
        contactName: "Pedro Santos",
        contactPhone: "(12) 95555-5555",
        contactEmail: "pedro@boicucanga.com"
      },
      {
        title: "Cobertura Boiçucanga Vista Verde",
        propertyType: "cobertura",
        description: "Cobertura com vista privilegiada da natureza preservada de Boiçucanga. Ambiente perfeito para relaxar e contemplar a beleza natural da região.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Boiçucanga",
        address: "Estrada de Boiçucanga, 567",
        zipCode: "11600-000",
        bedrooms: 3,
        bathrooms: 3,
        parkingSpaces: 2,
        area: 150,
        price: "2200000.00",
        condoFee: "520.00",
        iptu: "3500.00",
        businessType: "venda",
        amenities: ["vista-natureza", "terraço", "churrasqueira", "elevador"],
        mainImage: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3",
        contactName: "Lucia Almeida",
        contactPhone: "(12) 94444-6666",
        contactEmail: "lucia@boicucanga.com"
      },
      // Cambury - 2 properties
      {
        title: "Casa Rústica Cambury Natureza",
        propertyType: "casa",
        description: "Casa rústica em Cambury, praia selvagem e preservada ideal para ecoturismo. Perfeita para quem busca contato direto com a natureza e trilhas ecológicas.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Cambury",
        address: "Trilha do Cambury, 89",
        zipCode: "11600-000",
        bedrooms: 3,
        bathrooms: 2,
        parkingSpaces: 1,
        area: 180,
        price: "1400000.00",
        condoFee: "0.00",
        iptu: "2200.00",
        businessType: "venda",
        amenities: ["vista-natureza", "jardim", "churrasqueira", "trilhas"],
        mainImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3",
        contactName: "José Oliveira",
        contactPhone: "(12) 93333-7777",
        contactEmail: "jose@cambury.com"
      },
      {
        title: "Studio Ecológico Cambury",
        propertyType: "studio",
        description: "Studio sustentável em Cambury com design ecológico, próximo às trilhas e à natureza intocada. Ideal para quem valoriza sustentabilidade e vida selvagem.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Cambury",
        address: "Estrada do Cambury, 321",
        zipCode: "11600-000",
        bedrooms: 1,
        bathrooms: 1,
        parkingSpaces: 1,
        area: 60,
        price: "650000.00",
        condoFee: "200.00",
        iptu: "980.00",
        businessType: "venda",
        amenities: ["design-sustentavel", "jardim", "vista-natureza"],
        mainImage: "https://images.unsplash.com/photo-1586105251261-72a756497a11?ixlib=rb-4.0.3",
        contactName: "Maria Fernanda",
        contactPhone: "(12) 92222-8888",
        contactEmail: "maria@cambury.com"
      },
      // Toque-Toque Pequeno - 2 properties
      {
        title: "Casa Charme Toque-Toque Pequeno",
        propertyType: "casa",
        description: "Casa charmosa no romântico Toque-Toque Pequeno, praia pequena e aconchegante perfeita para casais. Ambiente íntimo e sofisticado.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Toque-Toque Pequeno",
        address: "Rua do Romance, 45",
        zipCode: "11600-000",
        bedrooms: 2,
        bathrooms: 2,
        parkingSpaces: 1,
        area: 120,
        price: "1600000.00",
        condoFee: "0.00",
        iptu: "2500.00",
        businessType: "venda",
        amenities: ["vista-mar", "jardim", "churrasqueira", "hidromassagem"],
        mainImage: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3",
        contactName: "Rafael Mendes",
        contactPhone: "(12) 91111-9999",
        contactEmail: "rafael@toquepequeno.com"
      },
      {
        title: "Apartamento Romântico Toque-Toque Pequeno",
        propertyType: "apartamento",
        description: "Apartamento romântico com decoração sofisticada no charmoso Toque-Toque Pequeno. Local perfeito para lua de mel e momentos especiais.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Toque-Toque Pequeno",
        address: "Avenida dos Namorados, 123",
        zipCode: "11600-000",
        bedrooms: 1,
        bathrooms: 1,
        parkingSpaces: 1,
        area: 70,
        price: "950000.00",
        condoFee: "320.00",
        iptu: "1500.00",
        businessType: "venda",
        amenities: ["vista-mar", "varanda", "portaria", "piscina"],
        mainImage: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3",
        contactName: "Isabella Cruz",
        contactPhone: "(12) 90000-1010",
        contactEmail: "isabella@toquepequeno.com"
      },
      // Toque-Toque Grande - 2 properties
      {
        title: "Casa Família Toque-Toque Grande",
        propertyType: "casa",
        description: "Casa ampla no Toque-Toque Grande, praia mais extensa e com boa infraestrutura. Ideal para famílias que querem espaço e comodidade.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Toque-Toque Grande",
        address: "Rua das Famílias, 234",
        zipCode: "11600-000",
        bedrooms: 4,
        bathrooms: 3,
        parkingSpaces: 3,
        area: 280,
        price: "2400000.00",
        condoFee: "0.00",
        iptu: "3800.00",
        businessType: "venda",
        amenities: ["piscina", "churrasqueira", "jardim", "area-gourmet", "playground"],
        mainImage: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?ixlib=rb-4.0.3",
        contactName: "Fernando Lima",
        contactPhone: "(12) 89999-2020",
        contactEmail: "fernando@toquegrande.com"
      },
      {
        title: "Apartamento Toque-Toque Grande Moderno",
        propertyType: "apartamento",
        description: "Apartamento moderno no Toque-Toque Grande com acabamentos contemporâneos. Ótima localização com acesso fácil às praias e comércios.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Toque-Toque Grande",
        address: "Estrada do Toque-Toque Grande, 456",
        zipCode: "11600-000",
        bedrooms: 3,
        bathrooms: 2,
        parkingSpaces: 2,
        area: 110,
        price: "1350000.00",
        condoFee: "450.00",
        iptu: "2300.00",
        businessType: "venda",
        amenities: ["elevador", "portaria", "piscina", "salao-festas"],
        mainImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3",
        contactName: "Camila Rodrigues",
        contactPhone: "(12) 88888-3030",
        contactEmail: "camila@toquegrande.com"
      },
      // Paúba - 2 properties
      {
        title: "Casa Vista Mar Paúba",
        propertyType: "casa",
        description: "Casa com vista mar na tranquila Paúba, praia calma ideal para relaxamento. Perfeita para quem busca paz e sossego longe das multidões.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Paúba",
        address: "Rua da Tranquilidade, 67",
        zipCode: "11600-000",
        bedrooms: 3,
        bathrooms: 2,
        parkingSpaces: 2,
        area: 160,
        price: "1700000.00",
        condoFee: "0.00",
        iptu: "2700.00",
        businessType: "venda",
        amenities: ["vista-mar", "jardim", "churrasqueira", "piscina"],
        mainImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3",
        contactName: "André Sousa",
        contactPhone: "(12) 87777-4040",
        contactEmail: "andre@pauba.com"
      },
      {
        title: "Apartamento Tranquilo Paúba",
        propertyType: "apartamento",
        description: "Apartamento em ambiente tranquilo de Paúba, ideal para quem valoriza silêncio e proximidade com a natureza preservada.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Paúba",
        address: "Avenida da Paz, 189",
        zipCode: "11600-000",
        bedrooms: 2,
        bathrooms: 2,
        parkingSpaces: 1,
        area: 90,
        price: "850000.00",
        condoFee: "280.00",
        iptu: "1400.00",
        businessType: "venda",
        amenities: ["portaria", "jardim", "piscina", "vista-natureza"],
        mainImage: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3",
        contactName: "Patrícia Nunes",
        contactPhone: "(12) 86666-5050",
        contactEmail: "patricia@pauba.com"
      },
      // Barra do Una - 2 properties
      {
        title: "Casa Aventura Barra do Una",
        propertyType: "casa",
        description: "Casa na Barra do Una, praia conhecida pelos esportes aquáticos e aventuras. Local perfeito para surfistas e aventureiros que buscam adrenalina.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Barra do Una",
        address: "Rua dos Surfistas, 312",
        zipCode: "11600-000",
        bedrooms: 3,
        bathrooms: 2,
        parkingSpaces: 2,
        area: 140,
        price: "1300000.00",
        condoFee: "0.00",
        iptu: "2000.00",
        businessType: "venda",
        amenities: ["churrasqueira", "jardim", "area-esportes", "deposito-pranchas"],
        mainImage: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?ixlib=rb-4.0.3",
        contactName: "Bruno Cardoso",
        contactPhone: "(12) 85555-6060",
        contactEmail: "bruno@barradouna.com"
      },
      {
        title: "Loft Moderno Barra do Una",
        propertyType: "loft",
        description: "Loft moderno na Barra do Una com design despojado e funcional. Ideal para jovens aventureiros e praticantes de esportes aquáticos.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Barra do Una",
        address: "Estrada da Barra do Una, 445",
        zipCode: "11600-000",
        bedrooms: 1,
        bathrooms: 1,
        parkingSpaces: 1,
        area: 75,
        price: "750000.00",
        condoFee: "250.00",
        iptu: "1200.00",
        businessType: "venda",
        amenities: ["design-moderno", "varanda", "deposito-equipamentos"],
        mainImage: "https://images.unsplash.com/photo-1555636222-cae831e670b3?ixlib=rb-4.0.3",
        contactName: "Carolina Dias",
        contactPhone: "(12) 84444-7070",
        contactEmail: "carolina@barradouna.com"
      },
      // Guaecá - 2 properties
      {
        title: "Casa Família Guaecá",
        propertyType: "casa",
        description: "Casa familiar em Guaecá, praia com ótima infraestrutura e ambiente seguro para crianças. Ideal para famílias que valorizam comodidade e segurança.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Guaecá",
        address: "Rua das Crianças, 123",
        zipCode: "11600-000",
        bedrooms: 4,
        bathrooms: 3,
        parkingSpaces: 2,
        area: 220,
        price: "1900000.00",
        condoFee: "0.00",
        iptu: "3200.00",
        businessType: "venda",
        amenities: ["piscina", "playground", "churrasqueira", "jardim", "portao-eletronico"],
        mainImage: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3",
        contactName: "Rodrigo Ferreira",
        contactPhone: "(12) 83333-8080",
        contactEmail: "rodrigo@guaeca.com"
      },
      {
        title: "Apartamento Seguro Guaecá",
        propertyType: "apartamento",
        description: "Apartamento em condomínio seguro de Guaecá com infraestrutura completa para famílias. Ambiente tranquilo e bem localizado.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Guaecá",
        address: "Avenida da Segurança, 567",
        zipCode: "11600-000",
        bedrooms: 3,
        bathrooms: 2,
        parkingSpaces: 2,
        area: 105,
        price: "1100000.00",
        condoFee: "420.00",
        iptu: "1900.00",
        businessType: "venda",
        amenities: ["portaria-24h", "piscina", "playground", "salao-festas", "elevador"],
        mainImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3",
        contactName: "Amanda Silva",
        contactPhone: "(12) 82222-9090",
        contactEmail: "amanda@guaeca.com"
      },
      // Centro - 2 properties
      {
        title: "Casa Histórica Centro São Sebastião",
        propertyType: "casa",
        description: "Casa no centro histórico de São Sebastião, região rica em cultura e história. Próxima a museus, restaurantes e pontos turísticos importantes.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Centro",
        address: "Rua da História, 89",
        zipCode: "11600-000",
        bedrooms: 3,
        bathrooms: 2,
        parkingSpaces: 1,
        area: 150,
        price: "980000.00",
        condoFee: "0.00",
        iptu: "1800.00",
        businessType: "venda",
        amenities: ["arquitetura-historica", "jardim", "churrasqueira"],
        mainImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3",
        contactName: "Eduardo Santos",
        contactPhone: "(12) 81111-0101",
        contactEmail: "eduardo@centross.com"
      },
      {
        title: "Apartamento Centro Comercial",
        propertyType: "apartamento",
        description: "Apartamento no centro comercial de São Sebastião com fácil acesso a serviços, comércios e transporte público. Ideal para investimento ou moradia.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Centro",
        address: "Avenida do Comércio, 234",
        zipCode: "11600-000",
        bedrooms: 2,
        bathrooms: 1,
        parkingSpaces: 1,
        area: 80,
        price: "650000.00",
        condoFee: "320.00",
        iptu: "1100.00",
        businessType: "venda",
        amenities: ["elevador", "portaria", "localizacao-central"],
        mainImage: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3",
        contactName: "Juliana Costa",
        contactPhone: "(12) 80000-1212",
        contactEmail: "juliana@centross.com"
      },
      // Enseada - 2 properties
      {
        title: "Casa Praia Enseada",
        propertyType: "casa",
        description: "Casa na praia da Enseada, conhecida por suas águas calmas e ambiente familiar. Perfeita para famílias com crianças pequenas e idosos.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Enseada",
        address: "Rua das Águas Calmas, 345",
        zipCode: "11600-000",
        bedrooms: 3,
        bathrooms: 2,
        parkingSpaces: 2,
        area: 170,
        price: "1500000.00",
        condoFee: "0.00",
        iptu: "2400.00",
        businessType: "venda",
        amenities: ["praia-calma", "jardim", "churrasqueira", "piscina"],
        mainImage: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?ixlib=rb-4.0.3",
        contactName: "Marcos Oliveira",
        contactPhone: "(12) 79999-1313",
        contactEmail: "marcos@enseada.com"
      },
      {
        title: "Apartamento Família Enseada",
        propertyType: "apartamento",
        description: "Apartamento familiar na tranquila Enseada, com infraestrutura ideal para crianças e ambiente seguro para toda a família.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Enseada",
        address: "Avenida da Família, 678",
        zipCode: "11600-000",
        bedrooms: 3,
        bathrooms: 2,
        parkingSpaces: 1,
        area: 95,
        price: "920000.00",
        condoFee: "380.00",
        iptu: "1600.00",
        businessType: "venda",
        amenities: ["playground", "piscina-infantil", "portaria", "salao-festas"],
        mainImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3",
        contactName: "Renata Lima",
        contactPhone: "(12) 78888-1414",
        contactEmail: "renata@enseada.com"
      },
      // Cigarras - 2 properties
      {
        title: "Casa Conforto Cigarras",
        propertyType: "casa",
        description: "Casa confortável em Cigarras, praia com boa infraestrutura hoteleira e gastronômica. Ideal para quem aprecia comodidade e bons restaurantes.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Cigarras",
        address: "Rua do Conforto, 456",
        zipCode: "11600-000",
        bedrooms: 4,
        bathrooms: 3,
        parkingSpaces: 2,
        area: 190,
        price: "1700000.00",
        condoFee: "0.00",
        iptu: "2800.00",
        businessType: "venda",
        amenities: ["piscina", "churrasqueira", "jardim", "area-gourmet"],
        mainImage: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3",
        contactName: "Felipe Martins",
        contactPhone: "(12) 77777-1515",
        contactEmail: "felipe@cigarras.com"
      },
      {
        title: "Apartamento Gourmet Cigarras",
        propertyType: "apartamento",
        description: "Apartamento com varanda gourmet em Cigarras, próximo aos melhores restaurantes da região. Perfeito para apreciadores da boa gastronomia.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Cigarras",
        address: "Avenida Gastronômica, 789",
        zipCode: "11600-000",
        bedrooms: 2,
        bathrooms: 2,
        parkingSpaces: 1,
        area: 85,
        price: "880000.00",
        condoFee: "350.00",
        iptu: "1500.00",
        businessType: "venda",
        amenities: ["varanda-gourmet", "portaria", "piscina", "elevador"],
        mainImage: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3",
        contactName: "Beatriz Alves",
        contactPhone: "(12) 76666-1616",
        contactEmail: "beatriz@cigarras.com"
      },
      // Canto do Mar - 2 properties
      {
        title: "Casa Romântica Canto do Mar",
        propertyType: "casa",
        description: "Casa romântica no Canto do Mar, local conhecido pelos lindos pores do sol. Ambiente perfeito para casais e momentos especiais.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Canto do Mar",
        address: "Rua do Pôr do Sol, 123",
        zipCode: "11600-000",
        bedrooms: 2,
        bathrooms: 2,
        parkingSpaces: 1,
        area: 110,
        price: "1400000.00",
        condoFee: "0.00",
        iptu: "2200.00",
        businessType: "venda",
        amenities: ["vista-por-do-sol", "jardim", "churrasqueira", "hidromassagem"],
        mainImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3",
        contactName: "Gabriel Rosa",
        contactPhone: "(12) 75555-1717",
        contactEmail: "gabriel@cantodomar.com"
      },
      {
        title: "Apartamento Vista Canto do Mar",
        propertyType: "apartamento",
        description: "Apartamento com vista privilegiada no Canto do Mar, ideal para contemplar os espetaculares pores do sol da região.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Canto do Mar",
        address: "Avenida dos Pores do Sol, 456",
        zipCode: "11600-000",
        bedrooms: 1,
        bathrooms: 1,
        parkingSpaces: 1,
        area: 65,
        price: "780000.00",
        condoFee: "280.00",
        iptu: "1300.00",
        businessType: "venda",
        amenities: ["vista-por-do-sol", "varanda", "portaria", "piscina"],
        mainImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3",
        contactName: "Sophia Reis",
        contactPhone: "(12) 74444-1818",
        contactEmail: "sophia@cantodomar.com"
      },
      // Jaraguá - 2 properties
      {
        title: "Casa Tradicional Jaraguá",
        propertyType: "casa",
        description: "Casa tradicional em Jaraguá, bairro histórico com arquitetura preservada e rica cultura caiçara. Perfeita para quem valoriza tradição e história.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Jaraguá",
        address: "Rua da Tradição, 789",
        zipCode: "11600-000",
        bedrooms: 3,
        bathrooms: 2,
        parkingSpaces: 1,
        area: 140,
        price: "1100000.00",
        condoFee: "0.00",
        iptu: "1900.00",
        businessType: "venda",
        amenities: ["arquitetura-tradicional", "jardim", "churrasqueira"],
        mainImage: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?ixlib=rb-4.0.3",
        contactName: "Antônio Silva",
        contactPhone: "(12) 73333-1919",
        contactEmail: "antonio@jaragua.com"
      },
      {
        title: "Apartamento Cultura Jaraguá",
        propertyType: "apartamento",
        description: "Apartamento no histórico Jaraguá, próximo às manifestações culturais caiçaras e pontos de interesse histórico da região.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Jaraguá",
        address: "Avenida da Cultura, 321",
        zipCode: "11600-000",
        bedrooms: 2,
        bathrooms: 1,
        parkingSpaces: 1,
        area: 75,
        price: "620000.00",
        condoFee: "250.00",
        iptu: "1000.00",
        businessType: "venda",
        amenities: ["localizacao-historica", "portaria", "elevador"],
        mainImage: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3",
        contactName: "Fernanda Castro",
        contactPhone: "(12) 72222-2020",
        contactEmail: "fernanda@jaragua.com"
      },
      // Barequeçaba - 2 properties
      {
        title: "Casa Aventura Barequeçaba",
        propertyType: "casa",
        description: "Casa em Barequeçaba, portal de entrada para trilhas e ecoturismo. Ideal para aventureiros e amantes da natureza selvagem.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Barequeçaba",
        address: "Trilha da Aventura, 654",
        zipCode: "11600-000",
        bedrooms: 3,
        bathrooms: 2,
        parkingSpaces: 2,
        area: 160,
        price: "1250000.00",
        condoFee: "0.00",
        iptu: "2000.00",
        businessType: "venda",
        amenities: ["acesso-trilhas", "jardim", "churrasqueira", "deposito-equipamentos"],
        mainImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3",
        contactName: "Diego Monteiro",
        contactPhone: "(12) 71111-2121",
        contactEmail: "diego@barequecaba.com"
      },
      {
        title: "Studio Natureza Barequeçaba",
        propertyType: "studio",
        description: "Studio integrado à natureza em Barequeçaba, perfeito para quem busca simplicidade e contato direto com o meio ambiente.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Barequeçaba",
        address: "Estrada da Natureza, 987",
        zipCode: "11600-000",
        bedrooms: 1,
        bathrooms: 1,
        parkingSpaces: 1,
        area: 55,
        price: "580000.00",
        condoFee: "150.00",
        iptu: "850.00",
        businessType: "venda",
        amenities: ["vista-natureza", "jardim", "design-integrado"],
        mainImage: "https://images.unsplash.com/photo-1586105251261-72a756497a11?ixlib=rb-4.0.3",
        contactName: "Luna Carvalho",
        contactPhone: "(12) 70000-2222",
        contactEmail: "luna@barequecaba.com"
      },
      // Praia da Baleia - 2 properties
      {
        title: "Casa Observação Praia da Baleia",
        propertyType: "casa",
        description: "Casa na Praia da Baleia, local famoso pela observação de baleias durante a temporada. Experiência única de contato com a vida marinha.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Praia da Baleia",
        address: "Rua das Baleias, 147",
        zipCode: "11600-000",
        bedrooms: 3,
        bathrooms: 2,
        parkingSpaces: 1,
        area: 130,
        price: "1800000.00",
        condoFee: "0.00",
        iptu: "2900.00",
        businessType: "venda",
        amenities: ["vista-oceano", "observacao-baleias", "jardim", "churrasqueira"],
        mainImage: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?ixlib=rb-4.0.3",
        contactName: "Ricardo Neves",
        contactPhone: "(12) 69999-2323",
        contactEmail: "ricardo@praiadabaleia.com"
      },
      {
        title: "Apartamento Oceânico Praia da Baleia",
        propertyType: "apartamento",
        description: "Apartamento com vista oceânica na Praia da Baleia, ideal para observação da vida marinha e momentos de conexão com o mar.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Praia da Baleia",
        address: "Avenida Oceânica, 258",
        zipCode: "11600-000",
        bedrooms: 2,
        bathrooms: 2,
        parkingSpaces: 1,
        area: 90,
        price: "1200000.00",
        condoFee: "400.00",
        iptu: "2000.00",
        businessType: "venda",
        amenities: ["vista-oceano", "varanda-ampla", "portaria", "elevador"],
        mainImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3",
        contactName: "Mariana Santos",
        contactPhone: "(12) 68888-2424",
        contactEmail: "mariana@praiadabaleia.com"
      },
      // Praia do Centro - 2 properties
      {
        title: "Casa Central Praia do Centro",
        propertyType: "casa",
        description: "Casa na Praia do Centro com localização privilegiada, próxima a todos os serviços e comércios da cidade. Ideal para moradia ou investimento.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Praia do Centro",
        address: "Rua Principal, 369",
        zipCode: "11600-000",
        bedrooms: 4,
        bathrooms: 3,
        parkingSpaces: 2,
        area: 200,
        price: "1600000.00",
        condoFee: "0.00",
        iptu: "2600.00",
        businessType: "venda",
        amenities: ["localizacao-central", "piscina", "churrasqueira", "jardim"],
        mainImage: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3",
        contactName: "Gustavo Lima",
        contactPhone: "(12) 67777-2525",
        contactEmail: "gustavo@praiadocentro.com"
      },
      {
        title: "Apartamento Investimento Praia do Centro",
        propertyType: "apartamento",
        description: "Apartamento para investimento na Praia do Centro, com alta demanda para locação devido à excelente localização central.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Praia do Centro",
        address: "Avenida Central, 741",
        zipCode: "11600-000",
        bedrooms: 2,
        bathrooms: 1,
        parkingSpaces: 1,
        area: 70,
        price: "720000.00",
        condoFee: "320.00",
        iptu: "1200.00",
        businessType: "venda",
        amenities: ["alto-potencial-locacao", "portaria", "elevador"],
        mainImage: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3",
        contactName: "Larissa Moura",
        contactPhone: "(12) 66666-2626",
        contactEmail: "larissa@praiadocentro.com"
      },
      // Praia do Porto Grande - 2 properties
      {
        title: "Casa Portuária Porto Grande",
        propertyType: "casa",
        description: "Casa na Praia do Porto Grande, região portuária com movimento de embarcações e vida marítima intensa. Ideal para quem aprecia o ambiente náutico.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Praia do Porto Grande",
        address: "Rua do Porto, 852",
        zipCode: "11600-000",
        bedrooms: 3,
        bathrooms: 2,
        parkingSpaces: 2,
        area: 150,
        price: "1300000.00",
        condoFee: "0.00",
        iptu: "2100.00",
        businessType: "venda",
        amenities: ["vista-porto", "jardim", "churrasqueira", "garagem-barco"],
        mainImage: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?ixlib=rb-4.0.3",
        contactName: "Samuel Costa",
        contactPhone: "(12) 65555-2727",
        contactEmail: "samuel@portogrande.com"
      },
      {
        title: "Apartamento Náutico Porto Grande",
        propertyType: "apartamento",
        description: "Apartamento com vista para o porto na Praia do Porto Grande, perfeito para apreciadores da vida marítima e movimento de embarcações.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Praia do Porto Grande",
        address: "Avenida Portuária, 963",
        zipCode: "11600-000",
        bedrooms: 2,
        bathrooms: 2,
        parkingSpaces: 1,
        area: 85,
        price: "900000.00",
        condoFee: "350.00",
        iptu: "1500.00",
        businessType: "venda",
        amenities: ["vista-porto", "varanda", "portaria", "elevador"],
        mainImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3",
        contactName: "Viviane Ribeiro",
        contactPhone: "(12) 64444-2828",
        contactEmail: "viviane@portogrande.com"
      },
      // Cachoeira Samambaiaçu - 2 properties
      {
        title: "Casa Cachoeira Samambaiaçu",
        propertyType: "casa",
        description: "Casa próxima à Cachoeira Samambaiaçu, rodeada pela exuberante Mata Atlântica. Ideal para quem busca tranquilidade e contato direto com a natureza preservada.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Cachoeira Samambaiaçu",
        address: "Trilha da Cachoeira, 159",
        zipCode: "11600-000",
        bedrooms: 2,
        bathrooms: 2,
        parkingSpaces: 1,
        area: 120,
        price: "1100000.00",
        condoFee: "0.00",
        iptu: "1700.00",
        businessType: "venda",
        amenities: ["proximidade-cachoeira", "mata-atlantica", "jardim", "churrasqueira"],
        mainImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3",
        contactName: "Henrique Barbosa",
        contactPhone: "(12) 63333-2929",
        contactEmail: "henrique@samambaiuacu.com"
      },
      {
        title: "Studio Natureza Samambaiaçu",
        propertyType: "studio",
        description: "Studio ecológico na região da Cachoeira Samambaiaçu, perfeito para meditação e reconexão com a natureza em meio à Mata Atlântica preservada.",
        state: "SP",
        city: "São Sebastião",
        neighborhood: "Cachoeira Samambaiaçu",
        address: "Estrada da Mata, 357",
        zipCode: "11600-000",
        bedrooms: 1,
        bathrooms: 1,
        parkingSpaces: 1,
        area: 50,
        price: "650000.00",
        condoFee: "100.00",
        iptu: "950.00",
        businessType: "venda",
        amenities: ["design-ecologico", "vista-mata", "jardim-nativo"],
        mainImage: "https://images.unsplash.com/photo-1586105251261-72a756497a11?ixlib=rb-4.0.3",
        contactName: "Yasmin Oliveira",
        contactPhone: "(12) 62222-3030",
        contactEmail: "yasmin@samambaiuacu.com"
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

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    // Generate embedding for the property
    const description = await generatePropertyDescription(insertProperty);
    const embedding = await generateEmbedding(description);

    const propertyWithEmbedding = {
      ...insertProperty,
      embedding: JSON.stringify(embedding),
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

    const [property] = await db.insert(properties).values(propertyWithEmbedding).returning();
    
    // Add to vector database
    await vectorDB.addProperty(property);
    
    return property;
  }

  async getProperty(id: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property || undefined;
  }

  async getAllProperties(): Promise<Property[]> {
    return await db.select().from(properties);
  }

  async searchProperties(query: string, limit: number = 3): Promise<Property[]> {
    const results = await vectorDB.searchSimilar(query, limit);
    return results.map(({ similarity, ...property }) => property);
  }

  async clearProperties(): Promise<void> {
    await db.delete(properties);
    vectorDB.clearProperties();
    console.log("Cleared all properties from storage and vector database");
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const messageData = {
      ...insertMessage,
      propertyIds: insertMessage.propertyIds ?? null
    };
    const [message] = await db.insert(chatMessages).values(messageData).returning();
    return message;
  }

  async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.timestamp);
  }

  async saveConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const conversationData = {
      ...insertConversation,
      privacyAccepted: insertConversation.privacyAccepted ?? true
    };
    const [conversation] = await db.insert(conversations).values(conversationData).returning();
    return conversation;
  }

  async updateConversation(sessionId: string, messages: any[]): Promise<void> {
    await db.update(conversations)
      .set({ 
        messages: messages, 
        updatedAt: sql`now()` 
      })
      .where(eq(conversations.sessionId, sessionId));
  }
}

// Use DatabaseStorage for persistent storage
export const storage = new DatabaseStorage();
