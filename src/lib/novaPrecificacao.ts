/**
 * "Nova precificação" do Smart ITO: devolve o rascunho pessoal ao padrão,
 * mantendo parâmetros do usuário, código de produto e catálogo central.
 * Não toca perfis, catálogo central nem cotações salvas.
 */
import { supabase } from "@/integrations/supabase/client";
import { SMART_ITO_NS } from "@/lib/offerings";
import { PRICING_OWNED_RAW_KEYS } from "@/lib/paramKeys";
import { CALCULATOR_KEY, CLIENT_PROFILE_CALCULATOR_FIELDS } from "@/lib/clientProfileFields";
import { ITSM_DEFAULTS } from "@/hooks/useITSMCalculator";
import {
  CAMADA_LABEL, CAMADA_ORDEM, ESCOPO_DEFAULT, ITENS_ADICIONAIS_DEFAULT, RESTRICOES_GERAIS_DEFAULT,
  type EscopoProposicao,
} from "@/data/escopoProposicao";
import { AJUSTES_COTACAO_PADRAO, resumoAjustes } from "@/lib/ajustesCotacao";
import { getActivePresetId, setActivePresetId } from "@/lib/activePreset";

/** Valor padrão de cada chave da cotação; `undefined` = a chave é removida. */
const PADRAO_POR_CHAVE: Record<string, unknown> = {
  "escopo:proposicao": ESCOPO_DEFAULT,
  "escopo:restricoesGerais": RESTRICOES_GERAIS_DEFAULT,
  "escopo:itensAdicionais": ITENS_ADICIONAIS_DEFAULT,
  "gestao-ti:rotinasOff": [],
  "gestao-ti:ajustesCotacao": AJUSTES_COTACAO_PADRAO,
  "gestao-ti:smartPerf:n3AllocHoras": [0, 0],
  "gestao-ti:smartPerf:n3Cortes": undefined,
  "gestao-ti:smartOp:horasMelhoria": 0,
  "gestao-ti:smartPerf:horasMelhoria": 0,
};

/** Financeiro dependente do município do cliente (removido; volta ao padrão). */
const FINANCEIRO_DO_CLIENTE = ["financeiro.cidadeIss", "financeiro.municipio"] as const;

/** Lista única do que a ação limpa: chaves da cotação + financeiro do cliente. */
export const CHAVES_LIMPAS_NOVA_PRECIFICACAO: { chave: string; padrao: unknown }[] = [
  ...PRICING_OWNED_RAW_KEYS.map((k) => ({ chave: SMART_ITO_NS + k, padrao: PADRAO_POR_CHAVE[k] })),
  // Financeiro existe com e sem namespace (perfis antigos).
  ...FINANCEIRO_DO_CLIENTE.flatMap((k) => [
    { chave: SMART_ITO_NS + k, padrao: undefined },
    { chave: k, padrao: undefined },
  ]),
];

/** Calculator com os campos de Perfil de Cliente de volta ao padrão. */
export function calculatorLimpo(atual: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(atual ?? ITSM_DEFAULTS) };
  const def = ITSM_DEFAULTS as unknown as Record<string, unknown>;
  for (const campo of CLIENT_PROFILE_CALCULATOR_FIELDS) {
    if (campo in def) out[campo] = def[campo];
    else delete out[campo];
  }
  return out;
}

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Itens do rascunho que não são o padrão e merecem conferência ao salvar
 * (escopo, restrições, itens adicionais, rotinas desligadas, horas).
 * `ler` devolve o valor salvo da chave crua (ou undefined).
 */
export function ajustesForaDoPadrao(ler: (rawKey: string) => unknown): string[] {
  const out: string[] = [];
  const escopo = ler("escopo:proposicao") as EscopoProposicao | undefined;
  if (escopo) {
    const editadas = CAMADA_ORDEM.filter((c) => escopo[c] && !igual(escopo[c], ESCOPO_DEFAULT[c]));
    if (editadas.length) out.push(`Escopo editado: ${editadas.map((c) => CAMADA_LABEL[c]).join(", ")}`);
  }
  const rest = ler("escopo:restricoesGerais");
  if (rest !== undefined && !igual(rest, RESTRICOES_GERAIS_DEFAULT)) out.push("Restrições gerais editadas");
  const itens = ler("escopo:itensAdicionais");
  if (itens !== undefined && !igual(itens, ITENS_ADICIONAIS_DEFAULT)) out.push("Itens adicionais editados");
  const off = ler("gestao-ti:rotinasOff");
  if (Array.isArray(off) && off.length) out.push(`${off.length} ${off.length === 1 ? "rotina desligada" : "rotinas desligadas"}`);
  out.push(...resumoAjustes(ler("gestao-ti:ajustesCotacao")));
  const melhoria = (Number(ler("gestao-ti:smartOp:horasMelhoria")) || 0) + (Number(ler("gestao-ti:smartPerf:horasMelhoria")) || 0);
  if (melhoria) out.push(`Horas de melhoria: ${melhoria}`);
  const alloc = ler("gestao-ti:smartPerf:n3AllocHoras");
  const tam = Array.isArray(alloc) ? alloc.reduce((s: number, v) => s + (Number(v) || 0), 0) : 0;
  if (tam) out.push(`Horas de TAM/Owner: ${tam}`);
  return out;
}

/** Leitura do rascunho pessoal (localStorage), para avisos na tela. */
export function lerRascunhoLocal(rawKey: string): unknown {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(SMART_ITO_NS + rawKey);
    return raw == null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** true quando o rascunho pessoal tem algo diferente do padrão. */
export function rascunhoTemAlteracoes(): boolean {
  if (ajustesForaDoPadrao(lerRascunhoLocal).length) return true;
  const calc = lerRascunhoLocal("itsm:calculator:v1") as Record<string, unknown> | undefined;
  if (calc && !igual(calc, calculatorLimpo(calc))) return true;
  return FINANCEIRO_DO_CLIENTE.some((k) => lerRascunhoLocal(k) !== undefined);
}

export const AVISO_NOVA_PRECIFICACAO_KEY = "itsm:nova-precificacao-aviso";

/**
 * Limpa o rascunho pessoal (localStorage + user_app_state) e, se houver
 * cotação aberta, sai do modo cotação (a cotação já está salva e não muda).
 */
export async function limparRascunhoSmartIto(): Promise<void> {
  if (getActivePresetId()) setActivePresetId(null);
  const { data: { user } } = await supabase.auth.getUser();

  // Calculator: parte do estado atual (local → nuvem) e zera só o Perfil de Cliente.
  let atual: Record<string, unknown> | null = null;
  try {
    const raw = window.localStorage.getItem(CALCULATOR_KEY);
    if (raw) atual = JSON.parse(raw);
  } catch { /* ignore */ }
  if (!atual && user) {
    const { data } = await supabase.from("user_app_state").select("value")
      .eq("user_id", user.id).eq("key", CALCULATOR_KEY).maybeSingle();
    if (data?.value && typeof data.value === "object") atual = data.value as Record<string, unknown>;
  }
  const calc = calculatorLimpo(atual);

  const gravar: { chave: string; valor: unknown }[] = [{ chave: CALCULATOR_KEY, valor: calc }];
  const remover: string[] = [];
  for (const { chave, padrao } of CHAVES_LIMPAS_NOVA_PRECIFICACAO) {
    if (padrao === undefined) remover.push(chave);
    else gravar.push({ chave, valor: padrao });
  }

  for (const { chave, valor } of gravar) {
    try { window.localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* ignore */ }
  }
  for (const chave of remover) {
    try { window.localStorage.removeItem(chave); } catch { /* ignore */ }
  }
  if (user) {
    const { error } = await supabase.from("user_app_state").upsert(
      gravar.map(({ chave, valor }) => ({ user_id: user.id, key: chave, value: valor as never })),
      { onConflict: "user_id,key" },
    );
    if (error) throw new Error(error.message);
    const { error: e2 } = await supabase.from("user_app_state").delete()
      .eq("user_id", user.id).in("key", remover);
    if (e2) throw new Error(e2.message);
  }
}

/** Ação completa: limpa, marca o aviso e recarrega no início do fluxo. */
export async function iniciarNovaPrecificacao(): Promise<void> {
  await limparRascunhoSmartIto();
  try { window.sessionStorage.setItem(AVISO_NOVA_PRECIFICACAO_KEY, "1"); } catch { /* ignore */ }
  window.location.href = "/ito";
}
