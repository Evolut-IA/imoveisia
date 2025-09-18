import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Search, Heart } from "lucide-react";
import { type Property } from "@shared/schema";

export function StatsPanel() {
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    enabled: true,
  });

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numPrice);
  };

  // Get popular properties (first 2 for demo)
  const popularProperties = (properties as Property[]).slice(0, 2);

  return (
    <div className="bg-card rounded-xl border border-border shadow-lg" data-testid="stats-panel">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-card-foreground mb-4">Estatísticas do Sistema</h2>
        
        <div className="space-y-4">
          <div className="bg-muted rounded-lg p-4" data-testid="stat-properties">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-primary" data-testid="properties-count">
                  {properties.length}
                </p>
                <p className="text-sm text-muted-foreground">Imóveis Cadastrados</p>
              </div>
              <Home className="w-8 h-8 text-primary" />
            </div>
          </div>
          
          <div className="bg-muted rounded-lg p-4" data-testid="stat-queries">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-primary">1,543</p>
                <p className="text-sm text-muted-foreground">Consultas Realizadas</p>
              </div>
              <Search className="w-8 h-8 text-primary" />
            </div>
          </div>
          
          <div className="bg-muted rounded-lg p-4" data-testid="stat-satisfaction">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-primary">89%</p>
                <p className="text-sm text-muted-foreground">Taxa de Satisfação</p>
              </div>
              <Heart className="w-8 h-8 text-primary" />
            </div>
          </div>
        </div>

        {popularProperties.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-card-foreground mb-3">Imóveis Populares</h3>
            <div className="space-y-3">
              {popularProperties.map((property: Property) => (
                <div 
                  key={property.id} 
                  className="flex items-center space-x-3 p-3 bg-muted rounded-lg"
                  data-testid={`popular-property-${property.id}`}
                >
                  <img 
                    src={property.mainImage || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&w=60&h=60"} 
                    alt={property.title}
                    className="w-12 h-12 object-cover rounded-lg" 
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&w=60&h=60";
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-card-foreground" data-testid={`popular-title-${property.id}`}>
                      {property.title}
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid={`popular-price-${property.id}`}>
                      {formatPrice(property.price)}
                    </p>
                  </div>
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                    Hot
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
