import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWebSocket } from "@/hooks/use-websocket";
import { Home, Bot, User, Send, MapPin, X, Bed, Bath, Ruler } from "lucide-react";

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
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

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

  const getUnsplashImages = (propertyType: string) => {
    const baseUrl = "https://images.unsplash.com/";
    const params = "?ixlib=rb-4.0.3&w=400&h=400&fit=crop";
    
    const imageUrls: { [key: string]: string[] } = {
      "apartamento": [
        `${baseUrl}photo-1545324418-cc1a3fa10c00${params}`, // Modern apartment
        `${baseUrl}photo-1502672260266-1c1ef2d93688${params}`, // Living room
        `${baseUrl}photo-1484154218962-a197022b5858${params}`, // Kitchen
        `${baseUrl}photo-1540518614846-7eded47d24e5${params}`, // Bedroom
        `${baseUrl}photo-1584622650111-993a426fbf0a${params}`, // Bathroom
        `${baseUrl}photo-1574362848149-11496d93a7c7${params}`, // Balcony view
      ],
      "casa": [
        `${baseUrl}photo-1570129477492-45c003edd2be${params}`, // Modern house
        `${baseUrl}photo-1505843513577-22bb7d21e455${params}`, // Living room
        `${baseUrl}photo-1556912173-3bb406ef7e77${params}`, // Kitchen
        `${baseUrl}photo-1586023492125-27b2c045efd7${params}`, // Bedroom
        `${baseUrl}photo-1620626011761-996317b8d101${params}`, // Backyard
        `${baseUrl}photo-1554995207-c18c203602cb${params}`, // Exterior
      ],
      "cobertura": [
        `${baseUrl}photo-1560448204-e02f11c3d0e2${params}`, // Penthouse
        `${baseUrl}photo-1571508601891-ca5e7a713859${params}`, // Terrace
        `${baseUrl}photo-1449844908441-8829872d2607${params}`, // City view
        `${baseUrl}photo-1512917774080-9991f1c4c750${params}`, // Living room
        `${baseUrl}photo-1541123437800-1bb1317badc2${params}`, // Kitchen
        `${baseUrl}photo-1578662996442-48f60103fc96${params}`, // Rooftop
      ],
      "studio": [
        `${baseUrl}photo-1554995207-c18c203602cb${params}`, // Studio apartment
        `${baseUrl}photo-1586023492125-27b2c045efd7${params}`, // Compact living
        `${baseUrl}photo-1484154218962-a197022b5858${params}`, // Kitchen area
        `${baseUrl}photo-1540518614846-7eded47d24e5${params}`, // Sleeping area
        `${baseUrl}photo-1574362848149-11496d93a7c7${params}`, // Window view
        `${baseUrl}photo-1584622650111-993a426fbf0a${params}`, // Bathroom
      ],
      "loft": [
        `${baseUrl}photo-1586023492125-27b2c045efd7${params}`, // Industrial loft
        `${baseUrl}photo-1574362848149-11496d93a7c7${params}`, // High ceilings
        `${baseUrl}photo-1556912173-3bb406ef7e77${params}`, // Open kitchen
        `${baseUrl}photo-1502672260266-1c1ef2d93688${params}`, // Living space
        `${baseUrl}photo-1571508601891-ca5e7a713859${params}`, // Windows
        `${baseUrl}photo-1540518614846-7eded47d24e5${params}`, // Bedroom area
      ]
    };

    const type = propertyType.toLowerCase();
    return imageUrls[type] || imageUrls["apartamento"];
  };

  const PropertyGallery = ({ property, onClose }: { property: Property; onClose: () => void }) => {
    const images = getUnsplashImages(property.propertyType);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    // Gerenciamento de foco e teclas
    useEffect(() => {
      // Salvar o elemento com foco atual
      lastFocusedElementRef.current = document.activeElement as HTMLElement;
      
      // Salvar o valor anterior do overflow do body
      const previousOverflow = document.body.style.overflow;
      
      // Focar no botão de fechar quando o modal abrir
      if (closeButtonRef.current) {
        closeButtonRef.current.focus();
      }

      // Prevenir scroll do body
      document.body.style.overflow = 'hidden';

      // Event listener para tecla Escape
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleClose();
        }
      };

      document.addEventListener('keydown', handleEscape);

      // Cleanup
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = previousOverflow;
        
        // Retornar foco para o elemento que abriu o modal
        if (lastFocusedElementRef.current) {
          lastFocusedElementRef.current.focus();
        }
      };
    }, []);

    const handleClose = () => {
      onClose();
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
      // Fechar modal apenas se clicar no overlay (fundo), não no conteúdo
      if (e.target === e.currentTarget) {
        handleClose();
      }
    };

    return (
      <div 
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" 
        data-testid="property-gallery"
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gallery-title"
      >
        <div className="bg-card rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 id="gallery-title" className="text-xl font-bold text-card-foreground" data-testid="gallery-title">
              {property.title}
            </h2>
            <Button
              ref={closeButtonRef}
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
              data-testid="close-gallery"
              aria-label="Fechar galeria"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-4">
            {/* Image Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6" data-testid="image-grid">
              {images.slice(0, 6).map((imageUrl, index) => (
                <div key={index} className="aspect-square overflow-hidden rounded-lg">
                  <img
                    src={imageUrl}
                    alt={`${property.title} - Imagem ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&w=400&h=400";
                    }}
                    data-testid={`gallery-image-${index}`}
                  />
                </div>
              ))}
            </div>

            {/* Property Details */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column - Basic Info */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-card-foreground mb-2">Informações Básicas</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <Home className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground mr-2">Tipo:</span>
                      <span className="text-card-foreground capitalize">{property.propertyType}</span>
                    </div>
                    <div className="flex items-center">
                      <Bed className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground mr-2">Quartos:</span>
                      <span className="text-card-foreground">{property.bedrooms}</span>
                    </div>
                    <div className="flex items-center">
                      <Bath className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground mr-2">Banheiros:</span>
                      <span className="text-card-foreground">{property.bathrooms}</span>
                    </div>
                    <div className="flex items-center">
                      <Ruler className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground mr-2">Área:</span>
                      <span className="text-card-foreground">{property.area}m²</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-card-foreground mb-2">Localização</h3>
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 mr-2 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="text-card-foreground">{property.neighborhood}</p>
                      <p className="text-muted-foreground">{property.city}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Price and Description */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-card-foreground mb-2">Preço</h3>
                  <div className="text-2xl font-bold text-primary">
                    {formatPrice(property.price)}
                  </div>
                </div>

                {property.description && (
                  <div>
                    <h3 className="font-semibold text-card-foreground mb-2">Descrição</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {property.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PropertyCard = ({ property }: { property: Property }) => {
    const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
      // Salvar referência do card que será focado novamente quando o modal fechar
      lastFocusedElementRef.current = e.currentTarget;
      setSelectedProperty(property);
    };

    return (
      <div 
        className="property-card bg-card border border-border rounded-lg p-3 sm:p-4 w-full max-w-sm sm:max-w-md cursor-pointer hover:bg-muted/50 transition-colors" 
        data-testid={`property-card-${property.id}`}
        onClick={handleCardClick}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick(e as any);
          }
        }}
        role="button"
        aria-label={`Ver galeria do imóvel ${property.title}`}
      >
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
  };

  return (
    <div className="lg:col-span-2 bg-card rounded-lg">
      {/* Header */}
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-card-foreground">Assistente Corretor IA</h2>
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
              Olá! 👋 Sou seu assistente imobiliário inteligente. Estou aqui para ajudar você a encontrar a casa dos seus sonhos!
            </p>
            <p className="text-foreground mt-2 text-sm sm:text-base">
              Me conte um pouco sobre o que você está procurando. Localização, número de quartos, faixa de preço, ou qualquer preferência especial que você tenha. ☺
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

      {/* Property Gallery Modal */}
      {selectedProperty && (
        <PropertyGallery 
          property={selectedProperty} 
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
}
