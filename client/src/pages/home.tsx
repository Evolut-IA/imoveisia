import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChatInterface } from "@/components/chat-interface";
import { PropertyForm } from "@/components/property-form";
import { StatsPanel } from "@/components/stats-panel";
import { Home, Plus, User } from "lucide-react";

export default function HomePage() {
  const [isFormVisible, setIsFormVisible] = useState(false);

  const toggleForm = () => {
    setIsFormVisible(!isFormVisible);
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="app-title">CasaBot</h1>
              <span className="text-sm text-muted-foreground bg-accent px-2 py-1 rounded-full">
                IA Imobiliária
              </span>
            </div>
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[calc(100vh-120px)]">
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
