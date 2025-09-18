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
      <header className="border-b border-border/20">
        <div className="container mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground" data-testid="app-title">CasaBot</h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-3">
              <Button
                onClick={toggleForm}
                variant="ghost"
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="register-toggle-button"
              >
                {isFormVisible ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Fechar
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Imóvel
                  </>
                )}
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <Button
              onClick={toggleMobileMenu}
              variant="ghost"
              className="md:hidden text-muted-foreground hover:text-foreground p-2"
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
            <div className="md:hidden mt-4 pt-4 border-t border-border/20">
              <Button
                onClick={() => {
                  toggleForm();
                  setIsMobileMenuOpen(false);
                }}
                variant="ghost"
                className="w-full text-left text-muted-foreground hover:text-foreground transition-colors"
                data-testid="mobile-register-toggle-button"
              >
                {isFormVisible ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Fechar
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Imóvel
                  </>
                )}
              </Button>
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
