import { useEffect, useRef, useState, useCallback } from "react";

export interface ChatMessage {
  type: 'user_message' | 'bot_response' | 'typing' | 'error' | 'session_start';
  content?: string;
  properties?: any[];
  reasoning?: string;
  isTyping?: boolean;
  sessionId?: string;
  message?: string;
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
            break;
            
          case 'bot_response':
            setIsTyping(false);
            setMessages(prev => [...prev, data]);
            break;
            
          case 'error':
            setIsTyping(false);
            setMessages(prev => [...prev, {
              type: 'bot_response',
              content: data.message || 'Ocorreu um erro. Tente novamente.'
            }]);
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
