import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Hub from "./pages/Hub";
import Detalhamento from "./pages/Detalhamento";
import EquipeN1 from "./pages/EquipeN1";
import EquipeN2 from "./pages/EquipeN2";
import EquipeN3 from "./pages/EquipeN3";
import ConfiguracoesFinanceiras from "./pages/ConfiguracoesFinanceiras";
import ConfiguracoesImpostos from "./pages/ConfiguracoesImpostos";
import ConfiguracoesComissoes from "./pages/ConfiguracoesComissoes";
import TaxasDemanda from "./pages/TaxasDemanda";
import NiveisObservabilidade from "./pages/NiveisObservabilidade";
import Precificacoes from "./pages/Precificacoes";
import GestaoTI from "./pages/GestaoTI";
import RelatorioDemanda from "./pages/RelatorioDemanda";
import ResumoCotacao from "./pages/ResumoCotacao";
import PerfisParametros from "./pages/PerfisParametros";
import Escopo from "./pages/Escopo";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import SemAcesso from "./pages/SemAcesso";
import Admin from "./pages/Admin";
import AprovacoesAdmin from "./pages/admin/AprovacoesAdmin";
import SolicitacoesAdmin from "./pages/admin/SolicitacoesAdmin";
import AprovacaoToken from "./pages/AprovacaoToken";
import MinhasAprovacoes from "./pages/MinhasAprovacoes";
import MinhasSolicitacoes from "./pages/MinhasSolicitacoes";
import EmBreve from "./pages/EmBreve";
import TreinamentoLayout from "./pages/treinamento/Layout";
import TreinamentoConfigurador from "./pages/treinamento/Configurador";
import TreinamentoProposta from "./pages/treinamento/Proposta";
import TreinamentoCotacoes from "./pages/treinamento/Cotacoes";
import TreinamentoResumo from "./pages/treinamento/Resumo";
import { TrnResultado, TrnImpostos, TrnComissoes } from "./pages/treinamento/financeiro/Financeiro";
import ZabbixLayout from "./pages/zabbix/Layout";
import SreLayout, { SreEmConstrucao } from "./pages/sre/Layout";
import SreConfiguracoes from "./pages/sre/Configuracoes";
import SreConfigurador from "./pages/sre/Configurador";
import SreCotacoes from "./pages/sre/Cotacoes";
import SreResumo from "./pages/sre/Resumo";
import { SreResultado, SreImpostos, SreComissoes } from "./pages/sre/Financeiro";
import ZbxConfigurador from "./pages/zabbix/Configurador";
import ZbxCotacoes from "./pages/zabbix/Cotacoes";
import ZbxProposta from "./pages/zabbix/Proposta";
import ZbxResumo from "./pages/zabbix/Resumo";
import { ZbxResultado, ZbxImpostos, ZbxComissoes } from "./pages/zabbix/Financeiro";
import ZbxConfiguracoes from "./pages/zabbix/Configuracoes";
import TrnConfiguracoes from "./pages/treinamento/configuracoes/Configuracoes";
import { ROTAS_LEGADO_BS, ALIASES_LEGADO_BS } from "@/lib/bodyshop/rotasLegado";
import BodyshopLayout from "./pages/bodyshop/Layout";
import BsProposta from "./pages/bodyshop/Proposta";
import BsConfiguracoes from "./pages/bodyshop/Configuracoes";
import BsConfigurador from "./pages/bodyshop/Configurador";
import BsCotacoes from "./pages/bodyshop/Cotacoes";
import BsResumo from "./pages/bodyshop/Resumo";
import { BsResultado, BsImpostos, BsComissoes } from "./pages/bodyshop/Financeiro";
import { ITSMProvider } from "./contexts/ITSMContext";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import SeoHead from "./components/SeoHead";
import ActivePresetBanner from "./components/ActivePresetBanner";
import { useLocation } from "react-router-dom";

const queryClient = new QueryClient();

function GlobalActivePresetBanner() {
  const { pathname } = useLocation();
  // Mostra o banner em todas as rotas Smart ITO (compartilham o workspace).
  const SHOW_ON = [
    "/ito", "/detalhamento", "/equipe-n1", "/equipe-n2", "/equipe-n3",
    "/financeiro", "/taxas-demanda", "/precificacoes",
    "/gestao-ti", "/relatorio-demanda", "/resumo-cotacao", "/escopo", "/perfis-parametros",
  ];
  if (!SHOW_ON.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;
  return <ActivePresetBanner />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ITSMProvider>
            <SeoHead />
            <GlobalActivePresetBanner />
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/sem-acesso" element={<SemAcesso />} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
              <Route path="/admin/aprovacoes" element={<ProtectedRoute requireAdmin><AprovacoesAdmin /></ProtectedRoute>} />
              <Route path="/admin/solicitacoes" element={<ProtectedRoute requireAdmin><SolicitacoesAdmin /></ProtectedRoute>} />
              <Route path="/aprovacao/:token" element={<AprovacaoToken />} />
              <Route path="/aprovacoes/minhas" element={<ProtectedRoute><MinhasAprovacoes /></ProtectedRoute>} />
              <Route path="/solicitacoes/minhas" element={<ProtectedRoute><MinhasSolicitacoes /></ProtectedRoute>} />
              <Route path="/" element={<ProtectedRoute><Hub /></ProtectedRoute>} />
              <Route path="/ito" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.home"><Index /></ProtectedRoute>} />
              <Route path="/detalhamento" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.detalhamento"><Detalhamento /></ProtectedRoute>} />
              <Route path="/equipe-n1" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.equipe_n1"><EquipeN1 /></ProtectedRoute>} />
              <Route path="/equipe-n2" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.equipe_n2"><EquipeN2 /></ProtectedRoute>} />
              <Route path="/equipe-n3" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.equipe_n3"><EquipeN3 /></ProtectedRoute>} />
              <Route path="/financeiro" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.financeiro"><ConfiguracoesFinanceiras /></ProtectedRoute>} />
              <Route path="/financeiro/impostos" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.financeiro"><ConfiguracoesImpostos /></ProtectedRoute>} />
              <Route path="/financeiro/comissoes" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.financeiro"><ConfiguracoesComissoes /></ProtectedRoute>} />
              <Route path="/niveis-observabilidade" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.niveis_observabilidade"><NiveisObservabilidade /></ProtectedRoute>} />
              <Route path="/taxas-demanda" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.taxas_demanda"><TaxasDemanda /></ProtectedRoute>} />
              <Route path="/precificacoes" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.precificacoes"><Precificacoes /></ProtectedRoute>} />
              <Route path="/gestao-ti" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.gestao_ti"><GestaoTI /></ProtectedRoute>} />
              <Route path="/relatorio-demanda" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.relatorio_demanda"><RelatorioDemanda /></ProtectedRoute>} />
              <Route path="/resumo-cotacao" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.resumo_cotacao"><ResumoCotacao /></ProtectedRoute>} />
              <Route path="/escopo" element={<ProtectedRoute group="ito" offering="smart-ito" permission="page.escopo"><Escopo /></ProtectedRoute>} />
              <Route path="/perfis-parametros" element={<ProtectedRoute group="ito" offering="smart-ito"><PerfisParametros /></ProtectedRoute>} />
              <Route path="/datacenter" element={<ProtectedRoute group="datacenter"><EmBreve /></ProtectedRoute>} />
              <Route path="/cloud" element={<ProtectedRoute group="cloud"><EmBreve /></ProtectedRoute>} />
              <Route path="/observabilidade" element={<ProtectedRoute group="observabilidade"><EmBreve /></ProtectedRoute>} />
              {/* Treinamento (Fase 1A): gate provisório = acesso ao Smart ITO */}
              <Route path="/observabilidade/treinamento" element={<ProtectedRoute permission="page.trn.view"><TreinamentoLayout /></ProtectedRoute>}>
                <Route index element={<TreinamentoConfigurador />} />
                <Route path="proposta" element={<TreinamentoProposta />} />
                <Route path="cotacoes" element={<TreinamentoCotacoes />} />
                <Route path="resumo" element={<TreinamentoResumo />} />
                <Route path="financeiro" element={<TrnResultado />} />
                <Route path="financeiro/impostos" element={<TrnImpostos />} />
                <Route path="financeiro/comissoes" element={<TrnComissoes />} />
                <Route path="configuracoes/*" element={<TrnConfiguracoes />} />
              </Route>
              <Route path="/observabilidade/subscricoes-zabbix" element={<ProtectedRoute permission="page.zbx.view"><ZabbixLayout /></ProtectedRoute>}>
                <Route index element={<ZbxConfigurador />} />
                <Route path="proposta" element={<ZbxProposta />} />
                <Route path="resumo" element={<ZbxResumo />} />
                <Route path="cotacoes" element={<ZbxCotacoes />} />
                <Route path="financeiro" element={<ZbxResultado />} />
                <Route path="financeiro/impostos" element={<ZbxImpostos />} />
                <Route path="financeiro/comissoes" element={<ZbxComissoes />} />
                <Route path="configuracoes/*" element={<ZbxConfiguracoes />} />
              </Route>
              <Route path="/observabilidade/consultivo-sre" element={<ProtectedRoute permission="page.sre.view"><SreLayout /></ProtectedRoute>}>
                <Route index element={<SreConfigurador />} />
                <Route path="proposta" element={<SreEmConstrucao titulo="Proposta" />} />
                <Route path="resumo" element={<SreResumo />} />
                <Route path="cotacoes" element={<SreCotacoes />} />
                <Route path="financeiro" element={<SreResultado />} />
                <Route path="financeiro/impostos" element={<SreImpostos />} />
                <Route path="financeiro/comissoes" element={<SreComissoes />} />
                <Route path="configuracoes/*" element={<ProtectedRoute permission="page.sre.admin"><SreConfiguracoes /></ProtectedRoute>} />
              </Route>
              <Route path="/pacote-horas" element={<ProtectedRoute group="ito" offering="pacote-horas"><EmBreve /></ProtectedRoute>} />
              {/* bodyshop oferta removida */}
              <Route path="/profissionais-alocados" element={<ProtectedRoute group="ito" offering="profissionais-alocados" permission="page.prof.view"><BodyshopLayout /></ProtectedRoute>}>
                <Route index element={<BsConfigurador />} />
                <Route path="proposta" element={<BsProposta />} />
                <Route path="resumo" element={<BsResumo />} />
                <Route path="cotacoes" element={<BsCotacoes />} />
                <Route path="financeiro" element={<BsResultado />} />
                <Route path="financeiro/impostos" element={<BsImpostos />} />
                <Route path="financeiro/comissoes" element={<BsComissoes />} />
                <Route path="configuracoes/*" element={<BsConfiguracoes />} />
              </Route>
              {/* Fase 6: endereços publicados continuam válidos, com os gates do destino. */}
              {[...ROTAS_LEGADO_BS, ...ALIASES_LEGADO_BS].map(({ origem, destino }) => (
                <Route key={origem} path={origem} element={<Navigate to={destino} replace />} />
              ))}
              <Route path="/profissionais-alocados/legado/*" element={<Navigate to="/profissionais-alocados" replace />} />
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
