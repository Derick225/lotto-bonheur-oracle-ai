import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Menu } from "lucide-react";
import Index from "./pages/Index-minimal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Toaster />
      <Sonner />
      <div className="min-h-screen bg-background">
        {/* Header simple */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Menu className="h-4 w-4" />
            </Button>
            <h2 className="font-semibold text-foreground">Lotto Bonheur Oracle AI</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        {/* Contenu principal */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;