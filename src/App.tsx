import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Detalhamento from "./pages/Detalhamento";
import EquipeN1 from "./pages/EquipeN1";
import EquipeN2 from "./pages/EquipeN2";
import EquipeN3 from "./pages/EquipeN3";
import ConfiguracoesFinanceiras from "./pages/ConfiguracoesFinanceiras";
import TaxasDemanda from "./pages/TaxasDemanda";
import Precificacoes from "./pages/Precificacoes";
import Operacao from "./pages/Operacao";
import NotFound from "./pages/NotFound";
import { ITSMProvider } from "./contexts/ITSMContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ITSMProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/detalhamento" element={<Detalhamento />} />
            <Route path="/equipe-n1" element={<EquipeN1 />} />
            <Route path="/equipe-n2" element={<EquipeN2 />} />
            <Route path="/equipe-n3" element={<EquipeN3 />} />
            <Route path="/financeiro" element={<ConfiguracoesFinanceiras />} />
            <Route path="/taxas-demanda" element={<TaxasDemanda />} />
            <Route path="/precificacoes" element={<Precificacoes />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ITSMProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
