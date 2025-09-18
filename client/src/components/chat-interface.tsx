import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWebSocket } from "@/hooks/use-websocket";
import { Home, Bot, User, Send, MapPin } from "lucide-react";

interface Property {
  id: string;
  title: string;
  propertyType: string;
  description: string;
  city: string;
  neighborhood: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  price: string;
  mainImage: string;
}

export function ChatInterface() {
  const { isConnected, sendMessage, messages, isTyping } = useWebSocket();
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !isConnected || isTyping) return;

    sendMessage(inputMessage.trim());
    setInputMessage("");
  };

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numPrice);
  };

  const PropertyCard = ({ property }: { property: Property }) => (
    <div className="property-card bg-card border border-border rounded-lg p-4 max-w-md" data-testid={`property-card-${property.id}`}>
      <img 
        src={property.mainImage} 
        alt={property.title}
        className="w-full h-32 object-cover rounded-lg mb-3" 
        onError={(e) => {
          e.currentTarget.src = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&w=400&h=200";
        }}
      />
      <h4 className="font-semibold text-card-foreground" data-testid={`property-title-${property.id}`}>
        {property.title}
      </h4>
      <p className="text-sm text-muted-foreground mb-2" data-testid={`property-details-${property.id}`}>
        {property.bedrooms} quartos • {property.bathrooms} banheiros • {property.area}m²
      </p>
      <p className="text-primary font-bold" data-testid={`property-price-${property.id}`}>
        {formatPrice(property.price)}
      </p>
      <div className="flex items-center mt-2 text-xs text-muted-foreground">
        <MapPin className="w-3 h-3 mr-1" />
        <span data-testid={`property-location-${property.id}`}>
          {property.neighborhood}, {property.city}
        </span>
      </div>
    </div>
  );

  return (
    <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-card-foreground">Assistente CasaBot</h2>
            <p className="text-sm text-muted-foreground">Encontre sua casa ideal com inteligência artificial</p>
          </div>
          <div className="ml-auto flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-muted-foreground" data-testid="connection-status">
              {isConnected ? 'Online' : 'Desconectado'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="h-[500px] overflow-y-auto chat-scroll p-6 space-y-4" data-testid="chat-messages">
        {/* Welcome Message */}
        <div className="flex items-start space-x-3 message-animation">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="bg-muted rounded-lg p-4 max-w-md">
            <p className="text-foreground">
              Olá! 👋 Sou o CasaBot, seu assistente imobiliário inteligente. Estou aqui para ajudar você a encontrar a casa dos seus sonhos!
            </p>
            <p className="text-foreground mt-2">
              Me conte um pouco sobre o que você está procurando: localização, número de quartos, faixa de preço, ou qualquer preferência especial que você tenha.
            </p>
          </div>
        </div>

        {/* Chat Messages */}
        {messages.map((message, index) => (
          <div key={index} className={`flex items-start space-x-3 message-animation ${
            message.type === 'user_message' ? 'justify-end' : ''
          }`} data-testid={`message-${index}`}>
            {message.type === 'user_message' ? (
              <>
                <div className="bg-primary rounded-lg p-4 max-w-md">
                  <p className="text-primary-foreground">{message.content}</p>
                </div>
                <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-accent-foreground" />
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="space-y-3">
                  <div className="bg-muted rounded-lg p-4 max-w-md">
                    <p className="text-foreground">{message.content}</p>
                  </div>
                  
                  {/* Property Cards */}
                  {message.properties && message.properties.length > 0 && (
                    <div className="space-y-3">
                      {message.properties.map((property: Property) => (
                        <PropertyCard key={property.id} property={property} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-start space-x-3 typing-indicator" data-testid="typing-indicator">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="bg-muted rounded-lg p-4">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t border-border">
        <form onSubmit={handleSubmit} className="flex space-x-3" data-testid="chat-form">
          <div className="flex-1">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={isTyping ? "Aguarde o bot responder..." : "Digite sua mensagem..."}
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={!isConnected || isTyping}
              data-testid="message-input"
            />
          </div>
          <Button 
            type="submit" 
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            disabled={!isConnected || !inputMessage.trim() || isTyping}
            data-testid="send-button"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
