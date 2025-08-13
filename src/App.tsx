import React, { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import Index from "./pages/Index";
import { DrawDataPage } from "./pages/DrawDataPage";
import { DrawStatsPage } from "./pages/DrawStatsPage";
import { DrawPredictionPage } from "./pages/DrawPredictionPage";
import { ConsultPage } from "./pages/ConsultPage";
import { HistoryPage } from "./pages/HistoryPage";
import { AdminPage } from "./pages/AdminPage";
import NotFound from "./pages/NotFound";
import { SecurityConfigService } from "./services/securityConfig";

const queryClient = new QueryClient();

const App = () => {
  // Initialize security configuration on app start
  useEffect(() => {
    SecurityConfigService.initialize();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
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
          <Button variant="outline" size="sm">
            Admin
          </Button>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/draw-data" element={<DrawDataPage />} />
          <Route path="/draw-stats" element={<DrawStatsPage />} />
          <Route path="/draw-prediction" element={<DrawPredictionPage />} />
          <Route path="/draw/:name/data" element={<DrawDataPage />} />
          <Route path="/draw/:name/stats" element={<DrawStatsPage />} />
          <Route path="/draw/:name/prediction" element={<DrawPredictionPage />} />
          <Route path="/consult" element={<ConsultPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
    </QueryClientProvider>
  );
};

export default App;
