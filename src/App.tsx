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
import FieldService from "./pages/FieldService";
import GestaoTI from "./pages/GestaoTI";
import RelatorioDemanda from "./pages/RelatorioDemanda";
import PerfisParametros from "./pages/PerfisParametros";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/Auth";
import SemAcesso from "./pages/SemAcesso";
import Admin from "./pages/Admin";
import { ITSMProvider } from "./contexts/ITSMContext";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import SeoHead from "./components/SeoHead";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ITSMProvider>
            <SeoHead />
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/sem-acesso" element={<SemAcesso />} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
              <Route path="/" element={<ProtectedRoute permission="page.home"><Index /></ProtectedRoute>} />
              <Route path="/detalhamento" element={<ProtectedRoute permission="page.detalhamento"><Detalhamento /></ProtectedRoute>} />
              <Route path="/equipe-n1" element={<ProtectedRoute permission="page.equipe_n1"><EquipeN1 /></ProtectedRoute>} />
              <Route path="/equipe-n2" element={<ProtectedRoute permission="page.equipe_n2"><EquipeN2 /></ProtectedRoute>} />
              <Route path="/equipe-n3" element={<ProtectedRoute permission="page.equipe_n3"><EquipeN3 /></ProtectedRoute>} />
              <Route path="/financeiro" element={<ProtectedRoute permission="page.financeiro"><ConfiguracoesFinanceiras /></ProtectedRoute>} />
              <Route path="/taxas-demanda" element={<ProtectedRoute permission="page.taxas_demanda"><TaxasDemanda /></ProtectedRoute>} />
              <Route path="/precificacoes" element={<ProtectedRoute permission="page.precificacoes"><Precificacoes /></ProtectedRoute>} />
              <Route path="/operacao" element={<ProtectedRoute permission="page.operacao"><Operacao /></ProtectedRoute>} />
              <Route path="/field-service" element={<ProtectedRoute permission="page.field_service"><FieldService /></ProtectedRoute>} />
              <Route path="/gestao-ti" element={<ProtectedRoute permission="page.gestao_ti"><GestaoTI /></ProtectedRoute>} />
              <Route path="/relatorio-demanda" element={<ProtectedRoute permission="page.relatorio_demanda"><RelatorioDemanda /></ProtectedRoute>} />
              <Route path="/perfis-parametros" element={<ProtectedRoute><PerfisParametros /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ITSMProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
