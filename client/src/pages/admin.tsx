import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PropertyForm } from "@/components/property-form";
import { StatsPanel } from "@/components/stats-panel";
import { Link } from "wouter";
import { Home, Plus, BarChart3, ArrowLeft, X } from "lucide-react";

export default function AdminPage() {
  const [isFormVisible, setIsFormVisible] = useState(false);

  const toggleForm = () => {
    setIsFormVisible(!isFormVisible);
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="border-b border-border/20">
        <div className="container mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="back-to-home-button"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground" data-testid="admin-title">
                  Administração
                </h1>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-3">
              <Button
                onClick={toggleForm}
                variant="ghost"
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="admin-toggle-form-button"
              >
                {isFormVisible ? (
                  <>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Ver Estatísticas
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Imóvel
                  </>
                )}
              </Button>
            </div>

            {/* Mobile Menu */}
            <div className="md:hidden">
              <Button
                onClick={toggleForm}
                variant="ghost"
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="admin-mobile-toggle-button"
              >
                {isFormVisible ? (
                  <BarChart3 className="w-5 h-5" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 gap-4 sm:gap-6 min-h-[calc(100vh-140px)] sm:min-h-[calc(100vh-120px)]">
          {/* Property Form or Stats Panel */}
          {isFormVisible ? (
            <div className="w-full max-w-4xl mx-auto">
              <PropertyForm 
                isVisible={isFormVisible} 
                onClose={() => setIsFormVisible(false)} 
              />
            </div>
          ) : (
            <div className="w-full max-w-4xl mx-auto">
              <StatsPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}