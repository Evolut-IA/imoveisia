import { ChatInterface } from "@/components/chat-interface";

export default function HomePage() {
  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="border-b border-border/20">
        <div className="container mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground" data-testid="app-title">
                CasaBot
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="min-h-[calc(100vh-140px)] sm:min-h-[calc(100vh-120px)]">
          {/* Chat Interface - Full Width */}
          <ChatInterface />
        </div>
      </div>
    </div>
  );
}