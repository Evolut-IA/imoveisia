import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertPropertySchema, insertChatMessageSchema, insertConversationSchema } from "@shared/schema";
import { generateChatResponse, splitMessageIntoChunks, generateContextualMessage } from "./services/openai";
import { randomUUID } from "crypto";

interface ChatSession {
  id: string;
  socket: WebSocket;
  lastActivity: Date;
  isTyping: boolean;
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

  // Generate contextual message for property
  app.post("/api/properties/:id/contextual-message", async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      const contextualMessage = await generateContextualMessage({
        id: property.id,
        title: property.title,
        propertyType: property.propertyType,
        description: property.description || '',
        city: property.city,
        neighborhood: property.neighborhood,
        bedrooms: property.bedrooms || 0,
        bathrooms: property.bathrooms || 0,
        area: property.area || 0,
        price: property.price
      });

      res.json({ message: contextualMessage });
    } catch (error) {
      console.error("Error generating contextual message:", error);
      res.status(500).json({ message: "Failed to generate contextual message" });
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

  // Conversation routes for lead capture
  app.post("/api/conversations", async (req, res) => {
    try {
      const validatedData = insertConversationSchema.parse(req.body);
      const conversation = await storage.saveConversation(validatedData);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error saving conversation:", error);
      res.status(400).json({ message: "Failed to save conversation: " + (error instanceof Error ? error.message : String(error)) });
    }
  });

  app.put("/api/conversations/:sessionId", async (req, res) => {
    try {
      const { messages } = req.body;
      
      // Validar se messages é um array com limite de tamanho
      if (!Array.isArray(messages)) {
        return res.status(400).json({ message: "Messages must be an array" });
      }
      
      if (messages.length > 1000) {
        return res.status(400).json({ message: "Messages array too large (max 1000)" });
      }
      
      // Validar estrutura básica de cada mensagem
      for (const msg of messages) {
        if (!msg.type || !msg.timestamp) {
          return res.status(400).json({ message: "Invalid message format: type and timestamp required" });
        }
      }
      
      const updatedRows = await storage.updateConversation(req.params.sessionId, messages);
      
      if (updatedRows === 0) {
        return res.status(404).json({ message: "Conversation not found for this session" });
      }
      
      res.json({ message: "Conversation updated successfully", updatedRows });
    } catch (error) {
      console.error("Error updating conversation:", error);
      res.status(500).json({ message: "Failed to update conversation" });
    }
  });

  // WebSocket chat handling
  wss.on('connection', (ws: WebSocket, req) => {
    const sessionId = randomUUID();
    const session: ChatSession = {
      id: sessionId,
      socket: ws,
      lastActivity: new Date(),
      isTyping: false
    };
    
    chatSessions.set(sessionId, session);
    console.log(`New chat session created: ${sessionId}`);
    console.log(`WebSocket connection established from: ${req.socket.remoteAddress}`);

    // Send session start
    ws.send(JSON.stringify({
      type: 'session_start',
      sessionId: sessionId
    }));

    ws.on('message', async (data) => {
      console.log(`[DEBUG] Received WebSocket message for session ${sessionId}:`, data.toString());
      try {
        const message = JSON.parse(data.toString());
        console.log(`[DEBUG] Parsed message:`, message);
        session.lastActivity = new Date();

        if (message.type === 'user_message') {
          console.log(`[DEBUG] Processing user_message for session ${sessionId}`);
          
          // Verificar se já está digitando
          if (session.isTyping) {
            console.log(`[DEBUG] Session ${sessionId} is already typing, ignoring message`);
            return; // Ignora mensagens enquanto está processando
          }

          console.log(`[DEBUG] Setting isTyping=true for session ${sessionId}`);
          session.isTyping = true;

          // Store user message
          console.log(`[DEBUG] About to store user message for session ${sessionId}`);
          await storage.createChatMessage({
            sessionId: sessionId,
            role: 'user',
            content: message.content,
            propertyIds: []
          });
          console.log(`[DEBUG] User message stored successfully for session ${sessionId}`);

          // Send typing indicator
          ws.send(JSON.stringify({
            type: 'typing',
            isTyping: true
          }));

          // Get chat history for context - últimas 5 trocas (10 mensagens)
          console.log(`[DEBUG] About to get chat history for session ${sessionId}`);
          const chatHistory = await storage.getChatHistory(sessionId);
          console.log(`[DEBUG] Chat history retrieved, length: ${chatHistory.length}`);
          
          // Pega as últimas 5 trocas (user + assistant pairs)
          const lastExchanges = [];
          let userCount = 0;
          
          // Itera do final para o início
          for (let i = chatHistory.length - 1; i >= 0 && userCount < 5; i--) {
            const msg = chatHistory[i];
            lastExchanges.unshift(msg);
            
            if (msg.role === 'user') {
              userCount++;
            }
          }
          
          const historyForAI = lastExchanges.map(msg => ({
            role: msg.role,
            content: msg.content
          }));

          // Extract recently recommended property IDs from last 3 assistant messages to avoid duplicates
          const recentAssistantMessages = chatHistory
            .filter(msg => msg.role === 'assistant')
            .slice(-3); // Last 3 assistant messages
          
          const recentlyRecommendedIds: string[] = [];
          for (const msg of recentAssistantMessages) {
            if (msg.propertyIds && Array.isArray(msg.propertyIds)) {
              recentlyRecommendedIds.push(...msg.propertyIds);
            }
          }

          // Get available properties for recommendation
          console.log(`[DEBUG] About to get all properties for session ${sessionId}`);
          const allProperties = await storage.getAllProperties();
          console.log(`[DEBUG] Properties retrieved, count: ${allProperties.length}`);
          const propertiesForAI = allProperties.map(p => ({
            id: p.id,
            title: p.title,
            description: p.description || '',
            price: parseFloat(p.price),
            city: p.city,
            neighborhood: p.neighborhood
          }));

          // Check if we have a saved conversation with user name
          let userName: string | null = null;
          let shouldUseUserName = false;
          
          try {
            const conversation = await storage.getConversationBySessionId(sessionId);
            if (conversation && conversation.leadName) {
              // Extract only the first name from the full name
              userName = conversation.leadName.trim().split(' ')[0];
              
              // Count only user messages that occurred AFTER the lead was captured
              const leadCaptureTime = new Date(conversation.createdAt || 0).getTime();
              
              // Filter messages that happened after lead capture
              const postCaptureUserMessages = chatHistory.filter(msg => {
                if (msg.role !== 'user') return false;
                
                // Parse timestamp from message (handle both string and number formats)
                const msgTime = msg.timestamp ? new Date(msg.timestamp).getTime() : 0;
                return msgTime > leadCaptureTime;
              });
              
              const postCaptureCount = postCaptureUserMessages.length;
              
              // Use name immediately after lead form (first message after capture) 
              // or every 3rd user message thereafter
              if (postCaptureCount === 1) {
                // First message after lead capture - always use name
                shouldUseUserName = true;
              } else if (postCaptureCount > 1 && (postCaptureCount - 1) % 3 === 0) {
                // Every 3rd message after the first: 4th, 7th, 10th, etc.
                shouldUseUserName = true;
              }
              
              console.log(`[DEBUG] Lead capture time: ${conversation.createdAt}, Post-capture user messages: ${postCaptureCount}, Should use name: ${shouldUseUserName}`);
              
              if (userName && shouldUseUserName) {
                console.log(`[PERSONALIZATION] Using name "${userName}" for session ${sessionId} (post-capture message #${postCaptureCount})`);
              }
            }
          } catch (error) {
            // If no conversation found, proceed without personalization
            console.log(`No saved conversation found for session ${sessionId}`);
          }

          // Generate AI response with duplicate prevention and personalization
          console.log(`[DEBUG] About to call generateChatResponse for session ${sessionId}`);
          console.log(`[DEBUG] Message content: "${message.content}"`);
          console.log(`[DEBUG] Chat history length: ${historyForAI.length}`);
          console.log(`[DEBUG] Available properties: ${propertiesForAI.length}`);
          
          const aiResponse = await generateChatResponse(
            message.content,
            historyForAI,
            propertiesForAI,
            recentlyRecommendedIds,
            userName,
            shouldUseUserName
          );
          
          console.log(`[DEBUG] AI Response received for session ${sessionId}`);

          console.log(`[DEBUG] AI Response for session ${sessionId}:`, {
            reasoning: aiResponse.reasoning,
            propertyIds: aiResponse.propertyIds,
            responseMessage: aiResponse.responseMessage
          });

          // Get full property details for recommended properties
          const recommendedProperties: any[] = [];
          for (const propertyId of aiResponse.propertyIds) {
            const property = await storage.getProperty(propertyId);
            if (property) {
              recommendedProperties.push(property);
            }
          }

          console.log(`[DEBUG] Recommended properties for session ${sessionId}:`, {
            count: recommendedProperties.length,
            properties: recommendedProperties.map(p => ({ id: p.id, title: p.title }))
          });

          // Store assistant message
          await storage.createChatMessage({
            sessionId: sessionId,
            role: 'assistant',
            content: aiResponse.responseMessage,
            propertyIds: aiResponse.propertyIds
          });

          // Split message into chunks and send with delays
          const messageChunks = splitMessageIntoChunks(aiResponse.responseMessage);
          
          let accumulatedContent = '';
          let totalDelay = 0;
          
          // Enviar chunks de texto primeiro
          for (let i = 0; i < messageChunks.length; i++) {
            const chunk = messageChunks[i];
            accumulatedContent += chunk.content;
            
            setTimeout(() => {
              if (ws.readyState === WebSocket.OPEN) {
                if (chunk.isLast && recommendedProperties.length === 0) {
                  // Última mensagem de texto sem propriedades
                  ws.send(JSON.stringify({
                    type: 'bot_response',
                    content: accumulatedContent,
                    properties: [],
                    reasoning: aiResponse.reasoning,
                    isChunked: true,
                    isLastChunk: true
                  }));
                  
                  // Para de "digitar"
                  ws.send(JSON.stringify({
                    type: 'typing',
                    isTyping: false
                  }));
                  
                  session.isTyping = false;
                } else if (chunk.isLast && recommendedProperties.length > 0) {
                  // Última mensagem de texto - enviar sem propriedades primeiro
                  ws.send(JSON.stringify({
                    type: 'bot_response',
                    content: accumulatedContent,
                    properties: [],
                    reasoning: aiResponse.reasoning,
                    isChunked: true,
                    isLastChunk: false
                  }));
                } else {
                  // Chunk intermediário: apenas texto
                  ws.send(JSON.stringify({
                    type: 'bot_response_chunk',
                    content: chunk.content,
                    isChunked: true,
                    isLastChunk: false
                  }));
                }
              }
            }, totalDelay);
            
            totalDelay += chunk.delay;
          }
          
          // Depois do texto, enviar cada propriedade individualmente com delays
          if (recommendedProperties.length > 0) {
            for (let i = 0; i < recommendedProperties.length; i++) {
              const property = recommendedProperties[i];
              const isLastProperty = i === recommendedProperties.length - 1;
              const propertyDelay = Math.floor(Math.random() * 2000) + 2000; // 2-4 segundos para propriedades
              
              setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    type: 'bot_property',
                    properties: [property], // Envia uma propriedade por vez
                    isLastProperty: isLastProperty,
                    reasoning: isLastProperty ? aiResponse.reasoning : undefined
                  }));
                  
                  // Se é a última propriedade, para de "digitar"
                  if (isLastProperty) {
                    ws.send(JSON.stringify({
                      type: 'typing',
                      isTyping: false
                    }));
                    
                    session.isTyping = false;
                  }
                }
              }, totalDelay + (i * propertyDelay));
            }
          }

        } else if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }

      } catch (error) {
        console.error(`[ERROR] WebSocket message error for session ${sessionId}:`, error);
        console.error(`[ERROR] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace');
        
        session.isTyping = false; // Reset typing state
        
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
