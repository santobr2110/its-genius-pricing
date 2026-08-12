import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const BASE = "https://ito-genius-pricing.lovable.app";

const ROUTE_META: Record<string, { title: string; description: string }> = {
  "/": {
    title: "IT Solutions Pricing Portal - Ofertas IT Solutions",
    description:
      "Dimensione equipes N1/N2/N3, modele demanda mensal e calcule preços de operações ITSM com markup divisor.",
  },
  "/detalhamento": {
    title: "Detalhamento de Custos — Smart ITO",
    description:
      "Composição detalhada de custos por área e tier de precificação para sua operação ITSM.",
  },
  "/equipe-n1": {
    title: "Equipe N1 — Smart ITO",
    description:
      "Dimensionamento, capacidade e custo mensal da equipe de Service Desk N1.",
  },
  "/equipe-n2": {
    title: "Equipe N2 — Smart ITO",
    description:
      "Dimensionamento, capacidade e custo mensal da equipe de suporte N2.",
  },
  "/equipe-n3": {
    title: "Equipe N3 — Smart ITO",
    description:
      "Dimensionamento, capacidade e custo mensal da equipe especialista N3.",
  },
  "/financeiro": {
    title: "Configurações Financeiras — Smart ITO",
    description:
      "Defina impostos, margens e encargos usados no cálculo de preço pelo método divisor markup.",
  },
  "/taxas-demanda": {
    title: "Taxas de Demanda — Smart ITO",
    description:
      "Configure taxas e parâmetros mensais de geração de chamados por categoria de inventário.",
  },
  "/precificacoes": {
    title: "Precificações Salvas — Smart ITO",
    description:
      "Gerencie presets de precificação ITSM salvos para reuso em propostas comerciais.",
  },
  "/gestao-ti": {
    title: "Gestão de TI — Smart ITO",
    description:
      "Configure rotinas, GMUDs e categorias de Gestão de TI vinculadas ao inventário do cliente.",
  },
  "/relatorio-demanda": {
    title: "Relatório de Demanda — Smart ITO",
    description:
      "Relatório consolidado de demanda por origem, considerando todas as camadas de oferta ITSM.",
  },
  "/resumo-cotacao": {
    title: "Resumo de Cotação — Smart ITO",
    description:
      "Resumo financeiro e operacional da precificação salva, exportável em PDF.",
  },
  "/auth": {
    title: "Entrar — Smart ITO",
    description:
      "Acesse o Smart ITO para dimensionar equipes e precificar operações de ITSM.",
  },
  "/admin": {
    title: "Administração — Smart ITO",
    description: "Gerenciamento de usuários, papéis e permissões do Smart ITO.",
  },
  "/sem-acesso": {
    title: "Sem acesso — Smart ITO",
    description: "Sua conta ainda não tem permissão para acessar esta área.",
  },
};

const FALLBACK = ROUTE_META["/"];

export default function SeoHead() {
  const { pathname } = useLocation();
  const meta = ROUTE_META[pathname] ?? FALLBACK;
  const url = `${BASE}${pathname}`;
  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
    </Helmet>
  );
}
