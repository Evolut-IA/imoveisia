import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChatInterface } from "@/components/chat-interface";
import { PropertyForm } from "@/components/property-form";
import { StatsPanel } from "@/components/stats-panel";
import { Home, Plus, User, Menu, X } from "lucide-react";

export default function HomePage() {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleForm = () => {
    setIsFormVisible(!isFormVisible);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg flex items-center justify-center">
                <Home className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground" data-testid="app-title">CasaBot</h1>
                <span className="hidden sm:inline text-xs sm:text-sm text-muted-foreground bg-accent px-2 py-1 rounded-full">
                  IA Imobiliária
                </span>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <Button
                onClick={toggleForm}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                data-testid="register-toggle-button"
              >
                {isFormVisible ? (
                  <>
                    <Plus className="w-4 h-4 mr-2 rotate-45" />
                    Fechar Formulário
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Cadastrar Imóvel
                  </>
                )}
              </Button>
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* Mobile Menu Button */}
            <Button
              onClick={toggleMobileMenu}
              className="md:hidden bg-transparent text-foreground p-2 hover:bg-muted"
              data-testid="mobile-menu-button"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-border pt-4">
              <div className="flex flex-col space-y-3">
                <Button
                  onClick={() => {
                    toggleForm();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-primary text-primary-foreground px-4 py-3 rounded-lg hover:bg-primary/90 transition-colors"
                  data-testid="mobile-register-toggle-button"
                >
                  {isFormVisible ? (
                    <>
                      <Plus className="w-4 h-4 mr-2 rotate-45" />
                      Fechar Formulário
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Cadastrar Imóvel
                    </>
                  )}
                </Button>
                <div className="flex items-center justify-center py-2">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-h-[calc(100vh-140px)] sm:min-h-[calc(100vh-120px)]">
          {/* Chat Interface */}
          <ChatInterface />

          {/* Property Form or Stats Panel */}
          {isFormVisible ? (
            <PropertyForm 
              isVisible={isFormVisible} 
              onClose={() => setIsFormVisible(false)} 
            />
          ) : (
            <StatsPanel />
          )}
        </div>
      </div>
    </div>
  );
}
