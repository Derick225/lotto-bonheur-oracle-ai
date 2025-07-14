import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
