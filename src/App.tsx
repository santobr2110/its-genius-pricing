import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Hub from "./pages/Hub";
import Detalhamento from "./pages/Detalhamento";
import EquipeN1 from "./pages/EquipeN1";
import EquipeN2 from "./pages/EquipeN2";
import EquipeN3 from "./pages/EquipeN3";
import ConfiguracoesFinanceiras from "./pages/ConfiguracoesFinanceiras";
import TaxasDemanda from "./pages/TaxasDemanda";
import Precificacoes from "./pages/Precificacoes";
import FieldService from "./pages/FieldService";
import GestaoTI from "./pages/GestaoTI";
import RelatorioDemanda from "./pages/RelatorioDemanda";
import PerfisParametros from "./pages/PerfisParametros";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/Auth";
import SemAcesso from "./pages/SemAcesso";
import Admin from "./pages/Admin";
import EmBreve from "./pages/EmBreve";
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
              <Route path="/" element={<ProtectedRoute><Hub /></ProtectedRoute>} />
              <Route path="/ito" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.home"><Index /></ProtectedRoute>} />
              <Route path="/detalhamento" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.detalhamento"><Detalhamento /></ProtectedRoute>} />
              <Route path="/equipe-n1" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.equipe_n1"><EquipeN1 /></ProtectedRoute>} />
              <Route path="/equipe-n2" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.equipe_n2"><EquipeN2 /></ProtectedRoute>} />
              <Route path="/equipe-n3" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.equipe_n3"><EquipeN3 /></ProtectedRoute>} />
              <Route path="/financeiro" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.financeiro"><ConfiguracoesFinanceiras /></ProtectedRoute>} />
              <Route path="/taxas-demanda" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.taxas_demanda"><TaxasDemanda /></ProtectedRoute>} />
              <Route path="/precificacoes" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.precificacoes"><Precificacoes /></ProtectedRoute>} />
              <Route path="/field-service" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.field_service"><FieldService /></ProtectedRoute>} />
              <Route path="/gestao-ti" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.gestao_ti"><GestaoTI /></ProtectedRoute>} />
              <Route path="/relatorio-demanda" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.relatorio_demanda"><RelatorioDemanda /></ProtectedRoute>} />
              <Route path="/perfis-parametros" element={<ProtectedRoute group="ito" offering="smart-ito"><PerfisParametros /></ProtectedRoute>} />
              <Route path="/datacenter" element={<ProtectedRoute group="datacenter"><EmBreve /></ProtectedRoute>} />
              <Route path="/cloud" element={<ProtectedRoute group="cloud"><EmBreve /></ProtectedRoute>} />
              <Route path="/observabilidade" element={<ProtectedRoute group="observabilidade"><EmBreve /></ProtectedRoute>} />
              <Route path="/pacote-horas" element={<ProtectedRoute group="ito" offering="pacote-horas"><EmBreve /></ProtectedRoute>} />
              <Route path="/bodyshop" element={<ProtectedRoute group="ito" offering="bodyshop"><EmBreve /></ProtectedRoute>} />
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
