/**
 * Catálogo estático de Grupos e Ofertas da Business Unit IT Solutions.
 *
 * Estrutura hierárquica usada em todo o sistema:
 *   Business Unit → Grupo → Oferta → Página/Recurso
 *
 * Cada Oferta tem seu próprio namespace (`group/offering`) usado para
 * isolar dados (localStorage, user_app_state, pricing_presets, etc.) e
 * chaves de permissão.
 */

export type GroupSlug = "ito" | "datacenter" | "cloud" | "observabilidade";

export interface OfferingDef {
  slug: string;
  name: string;
  status: "active" | "coming_soon";
  routePrefix: string;
  /** Rotas que pertencem a esta oferta (exatas). */
  routes: string[];
}

export interface GroupDef {
  slug: GroupSlug;
  name: string;
  status: "active" | "coming_soon";
  /** Rota direta do grupo quando não há seleção de oferta. */
  route: string;
  offerings: OfferingDef[];
}

export const GROUPS: GroupDef[] = [
  {
    slug: "ito",
    name: "ITO",
    status: "active",
    route: "/ito",
    offerings: [
      {
        slug: "smart-ito",
        name: "Smart ITO",
        status: "active",
        routePrefix: "/ito",
        routes: [
          "/ito",
          "/detalhamento",
          "/equipe-n1",
          "/equipe-n2",
          "/equipe-n3",
          "/financeiro",
          "/taxas-demanda",
          "/precificacoes",
          "/gestao-ti",
          "/relatorio-demanda",
          "/resumo-cotacao",
          "/perfis-parametros",
        ],
      },
      {
        slug: "profissionais-alocados",
        name: "BodyShop - Alocação de Profissionais",
        status: "active",
        routePrefix: "/profissionais-alocados",
        routes: ["/profissionais-alocados"],
      },
      {
        slug: "pacote-horas",
        name: "Pacote de Horas",
        status: "coming_soon",
        routePrefix: "/pacote-horas",
        routes: ["/pacote-horas"],
      },
    ],
  },
  { slug: "datacenter",     name: "Datacenter",     status: "coming_soon", route: "/datacenter",     offerings: [] },
  { slug: "cloud",          name: "Cloud",          status: "coming_soon", route: "/cloud",          offerings: [] },
  { slug: "observabilidade",name: "Observabilidade",status: "coming_soon", route: "/observabilidade",offerings: [] },
];

export function findGroup(slug: string): GroupDef | undefined {
  return GROUPS.find((g) => g.slug === slug);
}

export function findOffering(groupSlug: string, offeringSlug: string): OfferingDef | undefined {
  return findGroup(groupSlug)?.offerings.find((o) => o.slug === offeringSlug);
}

/** Resolve grupo/oferta ativos a partir do pathname atual. */
export function resolveContextFromPath(pathname: string): { group: GroupSlug | null; offering: string | null } {
  for (const g of GROUPS) {
    for (const o of g.offerings) {
      if (o.routes.includes(pathname) || pathname.startsWith(o.routePrefix + "/")) {
        return { group: g.slug, offering: o.slug };
      }
    }
    if (pathname === g.route) return { group: g.slug, offering: null };
  }
  return { group: null, offering: null };
}

// ---------- Namespacing de dados ----------

/** Prefixo aplicado a chaves de persistência (localStorage, user_app_state, app_defaults). */
export function dataNamespace(groupSlug: string, offeringSlug: string): string {
  return `${groupSlug}.${offeringSlug}.`;
}

/** Namespace padrão para o Smart ITO (única oferta hoje). */
export const SMART_ITO_NS = dataNamespace("ito", "smart-ito");

// ---------- Chaves de permissão ----------

export function groupAccessKey(group: string): string {
  return `group.${group}.access`;
}

export function offeringAccessKey(group: string, offering: string): string {
  return `offering.${group}.${offering}.access`;
}

/** Todas as chaves de acesso a Grupos (para gating do Hub e BU menu). */
export const GROUP_ACCESS_KEYS: Record<GroupSlug, string> = {
  ito: groupAccessKey("ito"),
  datacenter: groupAccessKey("datacenter"),
  cloud: groupAccessKey("cloud"),
  observabilidade: groupAccessKey("observabilidade"),
};

export const SMART_ITO_ACCESS_KEY = offeringAccessKey("ito", "smart-ito");
export const PACOTE_HORAS_ACCESS_KEY = offeringAccessKey("ito", "pacote-horas");
export const BODYSHOP_ACCESS_KEY = offeringAccessKey("ito", "bodyshop");
export const PROFISSIONAIS_ALOCADOS_ACCESS_KEY = offeringAccessKey("ito", "profissionais-alocados");