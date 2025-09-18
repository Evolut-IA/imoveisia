import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWebSocket } from "@/hooks/use-websocket";
import { Home, Send, MapPin, X, Bed, Bath, Ruler } from "lucide-react";
// import roboImage from "../assets/robo.png";

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


interface ChatEvent {
  type: 'message' | 'expanded_property' | 'contextual_message' | 'lead_form';
  timestamp: number;
  data: any;
  id: string;
}

interface LeadForm {
  name: string;
  whatsapp: string;
  privacyAccepted: boolean;
}

export function ChatInterface() {
  const { isConnected, sendMessage, messages, isTyping } = useWebSocket();
  const [inputMessage, setInputMessage] = useState("");
  const [expandedProperties, setExpandedProperties] = useState<Property[]>([]);
  const [chatEvents, setChatEvents] = useState<ChatEvent[]>([]);
  const [hasShownProperty, setHasShownProperty] = useState(false);
  const [hasCapturedLead, setHasCapturedLead] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [pendingMessage, setPendingMessage] = useState("");
  const [leadForm, setLeadForm] = useState<LeadForm>({ name: "", whatsapp: "+55 ", privacyAccepted: false });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageTimestamps = useRef<Map<string, number>>(new Map());
  const eventCounter = useRef<number>(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, chatEvents, showLeadForm]);

  // Detect when properties have been shown
  useEffect(() => {
    const hasProperties = messages.some(message => 
      message.type === 'bot_response' && message.properties && message.properties.length > 0
    );
    if (hasProperties) {
      setHasShownProperty(true);
    }
  }, [messages]);

  // Sync messages from WebSocket with chat events using stable timestamps
  useEffect(() => {
    setChatEvents(prev => {
      // Keep all non-message events
      const nonMessageEvents = prev.filter(event => event.type !== 'message');
      
      // Create stable message events
      const messageEvents: ChatEvent[] = messages.map((message, index) => {
        const messageId = `message-${index}`;
        
        // Use existing timestamp or create a new one
        if (!messageTimestamps.current.has(messageId)) {
          messageTimestamps.current.set(messageId, eventCounter.current++);
        }
        
        return {
          type: 'message',
          timestamp: messageTimestamps.current.get(messageId)!,
          data: message,
          id: messageId
        };
      });
      
      // Clean up timestamps for messages that no longer exist
      const currentMessageIds = new Set(messageEvents.map(e => e.id));
      for (const [id, _] of Array.from(messageTimestamps.current.entries())) {
        if (id.startsWith('message-') && !currentMessageIds.has(id)) {
          messageTimestamps.current.delete(id);
        }
      }
      
      // Combine and sort by timestamp
      const allEvents = [...nonMessageEvents, ...messageEvents];
      return allEvents.sort((a, b) => a.timestamp - b.timestamp);
    });
  }, [messages]);

  // Effect para adicionar propriedade expandida e mensagem contextual com IA
  useEffect(() => {
    if (expandedProperties.length > 0) {
      const lastProperty = expandedProperties[expandedProperties.length - 1];
      const expandedPropertyId = `expanded-${lastProperty.id}-${Date.now()}`;
      const contextualMessageId = `contextual-${lastProperty.id}-${Date.now()}`;
      
      // Add expanded property to timeline
      setChatEvents(prev => {
        const newEvent: ChatEvent = {
          type: 'expanded_property',
          timestamp: eventCounter.current++,
          data: lastProperty,
          id: expandedPropertyId
        };
        const updatedEvents = [...prev, newEvent];
        return updatedEvents.sort((a, b) => a.timestamp - b.timestamp);
      });
      
      // Clear previous timeout se existir
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Agenda geração de mensagem contextual após 1 segundo
      timeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch(`/api/properties/${lastProperty.id}/contextual-message`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          const contextualContent = response.ok 
            ? (await response.json()).message
            : `Este ${lastProperty.propertyType.toLowerCase()} em ${lastProperty.neighborhood} desperta seu interesse? Me conte suas impressões! 🏠`;
            
          // Add contextual message to timeline
          setChatEvents(prev => {
            const newEvent: ChatEvent = {
              type: 'contextual_message',
              timestamp: eventCounter.current++,
              data: {
                id: contextualMessageId,
                propertyTitle: lastProperty.title,
                content: contextualContent
              },
              id: contextualMessageId
            };
            const updatedEvents = [...prev, newEvent];
            return updatedEvents.sort((a, b) => a.timestamp - b.timestamp);
          });
          
        } catch (error) {
          console.error('Erro ao gerar mensagem contextual:', error);
          // Add fallback contextual message to timeline
          setChatEvents(prev => {
            const newEvent: ChatEvent = {
              type: 'contextual_message',
              timestamp: eventCounter.current++,
              data: {
                id: contextualMessageId,
                propertyTitle: lastProperty.title,
                content: `Este ${lastProperty.propertyType.toLowerCase()} em ${lastProperty.neighborhood} desperta seu interesse? Me conte suas impressões! 🏠`
              },
              id: contextualMessageId
            };
            const updatedEvents = [...prev, newEvent];
            return updatedEvents.sort((a, b) => a.timestamp - b.timestamp);
          });
        }
      }, 1000);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [expandedProperties]);

  const formatWhatsApp = (digits: string) => {
    // Sempre começa com +55
    let formatted = '+55 ';
    
    // Adiciona os números restantes com formatação (sem contar o 55)
    if (digits.length > 0) {
      if (digits.length <= 2) {
        // DDD: (11)
        formatted += `(${digits.slice(0, 2)}`;
      } else if (digits.length <= 7) {
        // DDD + início do número: (11) 9740
        formatted += `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}`;
      } else if (digits.length <= 10) {
        // 10 dígitos: (11) 7404-1539
        formatted += `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
      } else if (digits.length <= 11) {
        // 11 dígitos: (11) 97404-1539
        formatted += `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
      }
    }
    
    return formatted;
  };

  const getWhatsAppNumbers = (formatted: string) => {
    // Remove tudo exceto números e retira o código do país 55
    const allNumbers = formatted.replace(/\D/g, '');
    return allNumbers.startsWith('55') ? allNumbers.slice(2) : allNumbers;
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Não permite apagar o +55
    if (value.startsWith('+55')) {
      const digits = getWhatsAppNumbers(value);
      if (digits.length <= 11) {
        const formatted = formatWhatsApp(digits);
        setLeadForm(prev => ({ ...prev, whatsapp: formatted }));
      }
    }
  };

  const isWhatsAppComplete = () => {
    const numbers = getWhatsAppNumbers(leadForm.whatsapp);
    return numbers.length >= 10 && numbers.length <= 11;
  };

  const canSubmitLeadForm = () => {
    return leadForm.name.trim() && isWhatsAppComplete() && leadForm.privacyAccepted;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !isConnected || isTyping) return;

    // Verificar se precisa mostrar formulário de lead (apenas uma vez)
    if (hasShownProperty && !hasCapturedLead && !showLeadForm) {
      setPendingMessage(inputMessage.trim());
      setShowLeadForm(true);
      setInputMessage("");
      
      // Adicionar formulário à timeline
      setChatEvents(prev => {
        const newEvent: ChatEvent = {
          type: 'lead_form',
          timestamp: eventCounter.current++,
          data: {},
          id: `lead-form-${Date.now()}`
        };
        const updatedEvents = [...prev, newEvent];
        return updatedEvents.sort((a, b) => a.timestamp - b.timestamp);
      });
      
      return;
    }

    sendMessage(inputMessage.trim());
    setInputMessage("");
  };

  const handleLeadFormSubmit = () => {
    if (!canSubmitLeadForm()) return;
    
    // Processar dados do lead aqui (salvar no backend se necessário)
    console.log('Lead capturado:', leadForm);
    
    // Marcar como capturado para não mostrar novamente
    setHasCapturedLead(true);
    
    // Remover formulário da timeline
    setChatEvents(prev => prev.filter(event => event.type !== 'lead_form'));
    
    // Enviar mensagem pendente
    if (pendingMessage) {
      sendMessage(pendingMessage);
      setPendingMessage("");
    }
    
    // Esconder formulário
    setShowLeadForm(false);
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

  const PropertyDetails = ({ property }: { property: Property }) => {
    const images = getUnsplashImages(property.propertyType);

    return (
      <div className="bg-muted rounded-lg p-4 max-w-full space-y-4">
        {/* Título */}
        <h3 className="text-lg font-bold text-card-foreground" data-testid="property-details-title">
          {property.title}
        </h3>

        {/* Grid de Imagens */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2" data-testid="property-images">
          {images.slice(0, 6).map((imageUrl, index) => (
            <div key={index} className="aspect-square overflow-hidden rounded-lg">
              <img
                src={imageUrl}
                alt={`${property.title} - Imagem ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&w=400&h=400";
                }}
                data-testid={`property-detail-image-${index}`}
              />
            </div>
          ))}
        </div>

        {/* Informações Básicas */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="font-semibold text-card-foreground">Informações Básicas</h4>
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
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground mr-2">Localização:</span>
                <span className="text-card-foreground">{property.neighborhood}, {property.city}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-card-foreground mb-2">Preço</h4>
              <div className="text-xl font-bold text-primary">
                {formatPrice(property.price)}
              </div>
            </div>

            {property.description && (
              <div>
                <h4 className="font-semibold text-card-foreground mb-2">Descrição</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {property.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderChatEvent = (event: ChatEvent) => {
    switch (event.type) {
      case 'message':
        const message = event.data;
        return (
          <div key={event.id} className={`flex items-start space-x-2 sm:space-x-3 message-animation ${
            message.type === 'user_message' ? 'justify-end' : ''
          }`} data-testid={`message-${event.id}`}>
            {message.type === 'user_message' ? (
              <>
                <div className="bg-primary rounded-lg p-3 sm:p-4 max-w-[85%] sm:max-w-md">
                  <p className="text-primary-foreground text-sm sm:text-base">{message.content}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center flex-shrink-0">
                  <img src="/Robo.png" alt="Assistente" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover" />
                </div>
                <div className="space-y-2 sm:space-y-3 flex-1">
                  {message.content && (
                    <div className="bg-muted rounded-lg p-3 sm:p-4 max-w-[85%] sm:max-w-md">
                      <p className="text-foreground text-sm sm:text-base">{message.content}</p>
                    </div>
                  )}
                  
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
        );

      case 'expanded_property':
        const property = event.data;
        return (
          <div key={event.id} className="flex items-start space-x-2 sm:space-x-3 message-animation">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <Home className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
            </div>
            <div className="flex-1 max-w-full">
              <PropertyDetails property={property} />
            </div>
          </div>
        );

      case 'contextual_message':
        const contextMsg = event.data;
        return (
          <div key={event.id} className="flex items-start space-x-2 sm:space-x-3 message-animation">
            <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center flex-shrink-0">
              <img src="/Robo.png" alt="Assistente" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover" />
            </div>
            <div className="bg-muted rounded-lg p-3 sm:p-4 max-w-[85%] sm:max-w-md">
              <p className="text-foreground text-sm sm:text-base" data-testid={`contextual-message-${contextMsg.id}`}>
                {contextMsg.content}
              </p>
            </div>
          </div>
        );

      case 'lead_form':
        return (
          <div key={event.id} className="flex items-start space-x-2 sm:space-x-3 message-animation">
            <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center flex-shrink-0">
              <img src="/Robo.png" alt="Assistente" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover" />
            </div>
            <div className="bg-muted rounded-lg p-4 sm:p-6 max-w-[90%] sm:max-w-lg">
              <p className="text-foreground text-sm sm:text-base mb-4">
                Para continuar sua busca pelo imóvel ideal gratuitamente preencha seu nome e whatsapp.
              </p>
              
              <div className="space-y-4">
                {/* Campo Nome */}
                <div>
                  <Input
                    value={leadForm.name}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Seu nome completo"
                    className="w-full"
                    data-testid="lead-form-name"
                  />
                </div>

                {/* Campo WhatsApp */}
                <div>
                  <Input
                    value={leadForm.whatsapp}
                    onChange={handleWhatsAppChange}
                    placeholder="+55 (11) 99999-9999"
                    className="w-full"
                    data-testid="lead-form-whatsapp"
                  />
                </div>

                {/* Checkbox de políticas - só aparece se WhatsApp completo */}
                {isWhatsAppComplete() && (
                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="privacy-checkbox"
                      checked={leadForm.privacyAccepted}
                      onChange={(e) => setLeadForm(prev => ({ ...prev, privacyAccepted: e.target.checked }))}
                      className="mt-1"
                      data-testid="lead-form-privacy"
                    />
                    <label htmlFor="privacy-checkbox" className="text-xs sm:text-sm text-foreground cursor-pointer">
                      Concordo com as políticas de privacidade
                    </label>
                  </div>
                )}

                {/* Botão Continuar */}
                <Button
                  onClick={handleLeadFormSubmit}
                  disabled={!canSubmitLeadForm()}
                  className="w-full"
                  data-testid="lead-form-submit"
                >
                  Continuar
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const PropertyCard = ({ property }: { property: Property }) => {
    const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
      // Adicionar propriedade expandida ao chat
      setExpandedProperties(prev => [...prev, property]);
    };

    return (
      <div 
        className="property-card bg-card border border-border rounded-lg p-3 sm:p-4 w-full max-w-sm sm:max-w-md cursor-pointer" 
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
            <h2 className="text-lg sm:text-xl font-semibold text-card-foreground">Assistente Corretor</h2>
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
          <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center flex-shrink-0">
            <img src="/Robo.png" alt="Assistente" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover" />
          </div>
          <div className="bg-muted rounded-lg p-3 sm:p-4 max-w-[85%] sm:max-w-md">
            <p className="text-foreground text-sm sm:text-base">
              Olá! 👋 Sou seu assistente imobiliário inteligente. Estou aqui para ajudar você a encontrar a casa dos seus sonhos!
            </p>
            <p className="text-foreground mt-2 text-sm sm:text-base">
              Me conte um pouco sobre o que você está procurando. Localização, número de quartos, faixa de preço, ou qualquer preferência que você tenha. ☺️
            </p>
          </div>
        </div>

        {/* Unified Chat Timeline */}
        {chatEvents.map((event) => renderChatEvent(event))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-start space-x-2 sm:space-x-3 typing-indicator" data-testid="typing-indicator">
            <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center flex-shrink-0">
              <img src="/Robo.png" alt="Assistente" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover" />
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
              placeholder={
                showLeadForm 
                  ? "Preencha o formulário acima para continuar..." 
                  : isTyping 
                    ? "Aguarde o bot responder..." 
                    : "Digite sua mensagem..."
              }
              className="w-full !bg-input !border-border !text-foreground placeholder:!text-muted-foreground rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
              disabled={!isConnected || isTyping || showLeadForm}
              data-testid="message-input"
            />
          </div>
          <Button 
            type="submit" 
            className="bg-primary text-primary-foreground px-3 sm:px-4 py-2 sm:py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            disabled={!isConnected || !inputMessage.trim() || isTyping || showLeadForm}
            data-testid="send-button"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>

    </div>
  );
}
