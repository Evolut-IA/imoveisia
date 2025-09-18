import { useEffect, useRef, useState, useCallback } from "react";

export interface ChatMessage {
  type: 'user_message' | 'bot_response' | 'bot_response_chunk' | 'bot_property' | 'typing' | 'error' | 'session_start';
  content?: string;
  properties?: any[];
  reasoning?: string;
  isTyping?: boolean;
  sessionId?: string;
  message?: string;
  isChunked?: boolean;
  isLastChunk?: boolean;
  isLastProperty?: boolean;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  sessionId: string | null;
  sendMessage: (message: string) => void;
  messages: ChatMessage[];
  isTyping: boolean;
}

export function useWebSocket(): UseWebSocketReturn {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const currentBotMessage = useRef<string>('');

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setIsConnected(true);
      console.log("WebSocket connected");
    };

    ws.current.onmessage = (event) => {
      try {
        const data: ChatMessage = JSON.parse(event.data);
        
        switch (data.type) {
          case 'session_start':
            setSessionId(data.sessionId || null);
            setMessages(prev => [...prev, {
              type: 'bot_response',
              content: data.message || 'Conectado ao CasaBot!'
            }]);
            break;
            
          case 'typing':
            setIsTyping(data.isTyping || false);
            if (data.isTyping) {
              currentBotMessage.current = '';
            }
            break;
            
          case 'bot_response_chunk':
            // Acumula chunks da mensagem
            const newChunkContent = data.content || '';
            currentBotMessage.current = (currentBotMessage.current || '') + newChunkContent;
            
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMessageIndex = newMessages.length - 1;
              
              // Se a última mensagem é um chunk em progresso, atualiza
              if (lastMessageIndex >= 0 && newMessages[lastMessageIndex].type === 'bot_response' && newMessages[lastMessageIndex].isChunked) {
                newMessages[lastMessageIndex] = {
                  ...newMessages[lastMessageIndex],
                  content: currentBotMessage.current
                };
              } else {
                // Cria nova mensagem chunk apenas com o conteúdo acumulado
                newMessages.push({
                  type: 'bot_response',
                  content: newChunkContent, // Mostra apenas o novo chunk, não o acumulado
                  isChunked: true,
                  isLastChunk: false
                });
              }
              
              return newMessages;
            });
            break;
            
          case 'bot_response':
            if (data.isChunked && data.isLastChunk) {
              // Última mensagem chunked - substitui a mensagem anterior com todas as propriedades
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMessageIndex = newMessages.length - 1;
                
                if (lastMessageIndex >= 0 && newMessages[lastMessageIndex].isChunked) {
                  newMessages[lastMessageIndex] = {
                    ...data,
                    content: data.content || currentBotMessage.current,
                    isChunked: false
                  };
                } else {
                  newMessages.push({
                    ...data,
                    content: data.content || currentBotMessage.current,
                    isChunked: false
                  });
                }
                
                return newMessages;
              });
            } else {
              // Mensagem regular não chunked
              setMessages(prev => [...prev, data]);
            }
            currentBotMessage.current = '';
            break;
            
          case 'bot_property':
            // Propriedade individual enviada separadamente
            console.log('[DEBUG] Received bot_property:', data);
            
            // Só cria nova mensagem se há propriedades para mostrar
            if (data.properties && data.properties.length > 0) {
              console.log('[DEBUG] Adding property message:', data.properties);
              setMessages(prev => [...prev, {
                type: 'bot_response',
                content: undefined, // Sem texto, apenas propriedade
                properties: data.properties,
                reasoning: data.reasoning
              }]);
            }
            
            // Se é a última propriedade, para de digitar
            if (data.isLastProperty) {
              setIsTyping(false);
            }
            break;
            
          case 'error':
            setIsTyping(false);
            setMessages(prev => [...prev, {
              type: 'bot_response',
              content: data.message || 'Ocorreu um erro. Tente novamente.'
            }]);
            currentBotMessage.current = '';
            break;
            
          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      setIsTyping(false);
      console.log("WebSocket disconnected");
      
      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("Attempting to reconnect...");
        connect();
      }, 3000);
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
      setIsTyping(false);
    };
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      // Add user message to local state immediately
      setMessages(prev => [...prev, {
        type: 'user_message',
        content
      }]);
      
      // Send to server
      ws.current.send(JSON.stringify({
        type: 'user_message',
        content
      }));
    } else {
      console.error("WebSocket is not connected");
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  return {
    isConnected,
    sessionId,
    sendMessage,
    messages,
    isTyping
  };
}
