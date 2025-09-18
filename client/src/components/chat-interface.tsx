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
    <div className="property-card bg-card border border-border rounded-lg p-3 sm:p-4 w-full max-w-sm sm:max-w-md" data-testid={`property-card-${property.id}`}>
      <img 
        src={property.mainImage} 
        alt={property.title}
        className="w-full h-24 sm:h-32 object-cover rounded-lg mb-2 sm:mb-3" 
        onError={(e) => {
          e.currentTarget.src = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&w=400&h=200";
        }}
      />
      <h4 className="font-semibold text-card-foreground text-sm sm:text-base truncate" data-testid={`property-title-${property.id}`}>
        {property.title}
      </h4>
      <p className="text-xs sm:text-sm text-muted-foreground mb-2" data-testid={`property-details-${property.id}`}>
        {property.bedrooms} quartos • {property.bathrooms} banheiros • {property.area}m²
      </p>
      <p className="text-primary font-bold text-sm sm:text-base" data-testid={`property-price-${property.id}`}>
        {formatPrice(property.price)}
      </p>
      <div className="flex items-center mt-2 text-xs text-muted-foreground">
        <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
        <span className="truncate" data-testid={`property-location-${property.id}`}>
          {property.neighborhood}, {property.city}
        </span>
      </div>
    </div>
  );

  return (
    <div className="lg:col-span-2 bg-card rounded-lg">
      {/* Header */}
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-card-foreground">Assistente CasaBot</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Encontre sua casa ideal com inteligência artificial</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs sm:text-sm text-muted-foreground" data-testid="connection-status">
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="h-[400px] sm:h-[500px] overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4" data-testid="chat-messages">
        {/* Welcome Message */}
        <div className="flex items-start space-x-2 sm:space-x-3 message-animation">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
            <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
          </div>
          <div className="bg-muted rounded-lg p-3 sm:p-4 max-w-[85%] sm:max-w-md">
            <p className="text-foreground text-sm sm:text-base">
              Olá! 👋 Sou o CasaBot, seu assistente imobiliário inteligente. Estou aqui para ajudar você a encontrar a casa dos seus sonhos!
            </p>
            <p className="text-foreground mt-2 text-sm sm:text-base">
              Me conte um pouco sobre o que você está procurando: localização, número de quartos, faixa de preço, ou qualquer preferência especial que você tenha.
            </p>
          </div>
        </div>

        {/* Chat Messages */}
        {messages.map((message, index) => (
          <div key={index} className={`flex items-start space-x-2 sm:space-x-3 message-animation ${
            message.type === 'user_message' ? 'justify-end' : ''
          }`} data-testid={`message-${index}`}>
            {message.type === 'user_message' ? (
              <>
                <div className="bg-primary rounded-lg p-3 sm:p-4 max-w-[85%] sm:max-w-md">
                  <p className="text-primary-foreground text-sm sm:text-base">{message.content}</p>
                </div>
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-3 h-3 sm:w-4 sm:h-4 text-accent-foreground" />
                </div>
              </>
            ) : (
              <>
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
                </div>
                <div className="space-y-2 sm:space-y-3 flex-1">
                  {/* Só mostra o texto se existir conteúdo */}
                  {message.content && (
                    <div className="bg-muted rounded-lg p-3 sm:p-4 max-w-[85%] sm:max-w-md">
                      <p className="text-foreground text-sm sm:text-base">{message.content}</p>
                    </div>
                  )}
                  
                  {/* Property Cards */}
                  {message.properties && message.properties.length > 0 && (
                    <div className="space-y-2 sm:space-y-3">
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
          <div className="flex items-start space-x-2 sm:space-x-3 typing-indicator" data-testid="typing-indicator">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
            </div>
            <div className="bg-muted rounded-lg p-3 sm:p-4">
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
      <div className="p-3 sm:p-6">
        <form onSubmit={handleSubmit} className="flex space-x-2 sm:space-x-3" data-testid="chat-form">
          <div className="flex-1">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={isTyping ? "Aguarde o bot responder..." : "Digite sua mensagem..."}
              className="w-full bg-muted/30 border-muted rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
              disabled={!isConnected || isTyping}
              data-testid="message-input"
            />
          </div>
          <Button 
            type="submit" 
            className="bg-primary text-primary-foreground px-3 sm:px-4 py-2 sm:py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
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
