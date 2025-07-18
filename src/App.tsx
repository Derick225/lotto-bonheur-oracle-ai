import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider defaultOpen={true}>
          <div className="min-h-screen flex w-full bg-background">
            <AppSidebar />
            
            <div className="flex-1 flex flex-col">
              {/* Header global avec toggle */}
              <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-40">
                <div className="flex items-center gap-2">
                  <SidebarTrigger className="p-2" />
                  <div className="h-6 w-px bg-border mx-2" />
                  <h2 className="font-semibold text-foreground">Lotto Bonheur Oracle AI</h2>
                </div>
              </header>

              {/* Contenu principal */}
              <main className="flex-1 overflow-auto">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/draw/:drawName/data" element={<DrawDataPage />} />
                  <Route path="/draw/:drawName/stats" element={<DrawStatsPage />} />
                  <Route path="/draw/:drawName/prediction" element={<DrawPredictionPage />} />
                  <Route path="/draw/:drawName/consult" element={<ConsultPage />} />
                  <Route path="/draw/:drawName/history" element={<HistoryPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
