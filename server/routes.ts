import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertPropertySchema, insertChatMessageSchema } from "@shared/schema";
import { generateChatResponse } from "./services/openai";
import { randomUUID } from "crypto";

interface ChatSession {
  id: string;
  socket: WebSocket;
  lastActivity: Date;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const chatSessions = new Map<string, ChatSession>();

  // Property routes
  app.get("/api/properties", async (req, res) => {
    try {
      const properties = await storage.getAllProperties();
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/search", async (req, res) => {
    try {
      const { q, limit } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      
      const limitNum = limit ? parseInt(limit as string) : 3;
      const properties = await storage.searchProperties(q, limitNum);
      res.json(properties);
    } catch (error) {
      console.error("Error searching properties:", error);
      res.status(500).json({ message: "Failed to search properties" });
    }
  });

  app.post("/api/properties", async (req, res) => {
    try {
      const validatedData = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(validatedData);
      res.status(201).json(property);
    } catch (error) {
      console.error("Error creating property:", error);
      res.status(400).json({ message: "Failed to create property: " + (error instanceof Error ? error.message : String(error)) });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  // Chat history routes
  app.get("/api/chat/:sessionId", async (req, res) => {
    try {
      const messages = await storage.getChatHistory(req.params.sessionId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  // WebSocket chat handling
  wss.on('connection', (ws: WebSocket, req) => {
    const sessionId = randomUUID();
    const session: ChatSession = {
      id: sessionId,
      socket: ws,
      lastActivity: new Date()
    };
    
    chatSessions.set(sessionId, session);
    console.log(`New chat session created: ${sessionId}`);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'session_start',
      sessionId: sessionId,
      message: 'Conectado ao CasaBot! Como posso ajudar você a encontrar sua casa ideal? 🏠'
    }));

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        session.lastActivity = new Date();

        if (message.type === 'user_message') {
          // Store user message
          await storage.createChatMessage({
            sessionId: sessionId,
            role: 'user',
            content: message.content,
            propertyIds: []
          });

          // Send typing indicator
          ws.send(JSON.stringify({
            type: 'typing',
            isTyping: true
          }));

          // Get chat history for context
          const chatHistory = await storage.getChatHistory(sessionId);
          const historyForAI = chatHistory.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content
          }));

          // Get available properties for recommendation
          const allProperties = await storage.getAllProperties();
          const propertiesForAI = allProperties.map(p => ({
            id: p.id,
            title: p.title,
            description: p.description || '',
            price: parseFloat(p.price),
            city: p.city,
            neighborhood: p.neighborhood
          }));

          // Generate AI response
          const aiResponse = await generateChatResponse(
            message.content,
            historyForAI,
            propertiesForAI
          );

          // Get full property details for recommended properties
          const recommendedProperties = [];
          for (const propertyId of aiResponse.propertyIds) {
            const property = await storage.getProperty(propertyId);
            if (property) {
              recommendedProperties.push(property);
            }
          }

          // Store assistant message
          await storage.createChatMessage({
            sessionId: sessionId,
            role: 'assistant',
            content: aiResponse.responseMessage,
            propertyIds: aiResponse.propertyIds
          });

          // Send response to client
          ws.send(JSON.stringify({
            type: 'bot_response',
            content: aiResponse.responseMessage,
            properties: recommendedProperties,
            reasoning: aiResponse.reasoning
          }));

        } else if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }

      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.'
        }));
      }
    });

    ws.on('close', () => {
      chatSessions.delete(sessionId);
      console.log(`Chat session closed: ${sessionId}`);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for session ${sessionId}:`, error);
      chatSessions.delete(sessionId);
    });
  });

  // Clean up inactive sessions periodically
  setInterval(() => {
    const now = new Date();
    for (const [sessionId, session] of Array.from(chatSessions.entries())) {
      const inactiveTime = now.getTime() - session.lastActivity.getTime();
      if (inactiveTime > 30 * 60 * 1000) { // 30 minutes
        session.socket.close();
        chatSessions.delete(sessionId);
        console.log(`Cleaned up inactive session: ${sessionId}`);
      }
    }
  }, 5 * 60 * 1000); // Check every 5 minutes

  return httpServer;
}
