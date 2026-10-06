import { Link } from "react-router-dom";
import { Gauge, RotateCcw, Plus, Trash2, Layers, Calculator, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SortableNav from "@/components/SortableNav";
import BackHomeButton from "@/components/BackHomeButton";
import WriteFence from "@/components/auth/WriteFence";
import { useITSMContext } from "@/contexts/ITSMContext";
import { formatBRL, formatNumber } from "@/hooks/useITSMCalculator";
import {
  DEFAULT_NIVEIS, DEFAULT_OBS_CUSTO_HORA, DEFAULT_OBS_CUSTO_PROXY, DEFAULT_OBS_FAIXAS,
  DEFAULT_OBS_NVPS, DEFAULT_OBS_PESOS, DEFAULT_PORTES, NIVEL_INFO, PISO_NIVEL_POR_CAMADA,
  computeCustoObservabilidadeNiveis, nivelAbaixoDoPiso,
  type NivelObservabilidade, type ObsPesos,
} from "@/lib/custoObservabilidadeNiveis";

const NIVEIS: NivelObservabilidade[] = ["M1", "M2", "M3", "M4"];
const TIPOS: { key: keyof ObsPesos; label: string; qtd: "qtdServidores" | "qtdBancosDados" | "qtdSistemas" | "qtdAtivosRede" }[] = [
  { key: "servidores", label: "Servidores", qtd: "qtdServidores" },
  { key: "bancoDados", label: "Banco de Dados", qtd: "qtdBancosDados" },
  { key: "firewall", label: "Firewall", qtd: "qtdSistemas" },
  { key: "ativosRede", label: "Ativos de Rede", qtd: "qtdAtivosRede" },
];

function Num({ value, onChange, step = 1, className = "" }: { value: number; onChange: (v: number) => void; step?: number; className?: string }) {
  return (
    <Input type="number" step={step} value={value} className={`h-7 text-xs ${className}`}
      onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))} />
  );
}

export default function NiveisObservabilidade() {
  const { state, update } = useITSMContext();
  const ativo = state.modeloObservabilidade === "niveis";
  const nivel = state.nivelObservabilidade ?? "M2";
  const pesos = state.obsPesos ?? DEFAULT_OBS_PESOS;
  const nvps = state.obsNvpsPorAtivo ?? DEFAULT_OBS_NVPS;
  const faixas = state.obsFaixas ?? DEFAULT_OBS_FAIXAS;
  const niveis = state.obsNiveis ?? DEFAULT_NIVEIS;
  const portes = state.obsPortes ?? DEFAULT_PORTES;
  const horas = state.obsHorasManutencao ?? 0;
  const proxies = state.obsQtdProxies ?? 0;
  const custoHora = state.obsCustoHora ?? DEFAULT_OBS_CUSTO_HORA;
  const custoProxy = state.obsCustoProxy ?? DEFAULT_OBS_CUSTO_PROXY;

  const calc = computeCustoObservabilidadeNiveis({
    inv: {
      qtdServidores: state.qtdServidores || 0, qtdBancosDados: state.qtdBancosDados || 0,
      qtdSistemas: state.qtdSistemas || 0, qtdAtivosRede: state.qtdAtivosRede || 0,
    },
    nivel, pesos, nvpsPorAtivo: nvps, faixas, niveis, portes,
    nvpsMedido: state.obsNvpsMedido ?? 0, horas, qtdProxies: proxies, custoHora, custoProxy,
  });

  // Camada dominante (mais alta ativa) para validar piso.
  const camada = state.tierEnterprise ? "Enterprise" : state.tierPerformance ? "Performance"
    : state.tierOperation ? "Operation" : state.tierFlow ? "Flow" : state.tierMonitor ? "Monitor" : null;
  const piso = camada ? PISO_NIVEL_POR_CAMADA[camada] : null;
  const abaixo = piso ? nivelAbaixoDoPiso(nivel, piso) : false;

  const restaurar = () => {
    update("obsPesos", DEFAULT_OBS_PESOS);
    update("obsNvpsPorAtivo", DEFAULT_OBS_NVPS);
    update("obsFaixas", DEFAULT_OBS_FAIXAS);
    update("obsNiveis", DEFAULT_NIVEIS);
    update("obsPortes", DEFAULT_PORTES);
    update("obsCustoHora", DEFAULT_OBS_CUSTO_HORA);
    update("obsCustoProxy", DEFAULT_OBS_CUSTO_PROXY);
  };

  const cfg = niveis[nivel];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-3 px-4">
          <BackHomeButton />
          <Link to="/ito" className="flex items-center gap-2 hover:opacity-80 min-w-0">
            <Gauge className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">Níveis de Observabilidade</h1>
          </Link>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <SortableNav current="niveis-obs" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6 space-y-6">
        {!ativo ? (
          <Card>
            <CardContent className="py-10 text-center space-y-3">
              <Layers className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm font-semibold">O modelo ativo nesta precificação é o Monitoramento clássico.</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Para usar a Observabilidade em níveis (M1–M4), selecione o modelo na tela de Camadas.
                Os parâmetros desta página não entram em nenhum cálculo enquanto o modelo clássico estiver ativo.
              </p>
              <Link to="/ito"><Button size="sm" variant="outline">Ir para Camadas</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <WriteFence permission="page.niveis_observabilidade.write" anyOf={["pricing.edit", "params.save_defaults"]}>
            <div className="space-y-6">
              <div className="flex justify-end">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={restaurar}>
                  <RotateCcw className="h-3.5 w-3.5" /> Restaurar padrão
                </Button>
              </div>

              {/* 1. Nível */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">1. Nível de observabilidade contratado</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {NIVEIS.map((n) => (
                      <button key={n} type="button" onClick={() => update("nivelObservabilidade", n)}
                        className={`rounded-lg border p-3 text-left transition ${nivel === n ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50"}`}>
                        <div className="flex items-center gap-2">
                          <Badge variant={nivel === n ? "default" : "secondary"}>{n}</Badge>
                          <span className="text-xs font-semibold">{NIVEL_INFO[n].titulo}</span>
                        </div>
                        <p className="mt-2 text-[11px] text-muted-foreground">"{NIVEL_INFO[n].pergunta}"</p>
                        {n === "M4" && <p className="mt-1 text-[10px] text-muted-foreground italic">Fora do modelo por UM · opcional em todas as camadas</p>}
                      </button>
                    ))}
                  </div>
                  {camada && (
                    <p className={`text-xs ${abaixo ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      Camada Smart {camada}: piso mínimo {piso}.{abaixo ? ` O nível ${nivel} está abaixo do piso.` : ""}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* 2. Inventário */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    2. Inventário e UM ponderada
                    <Link to="/ito" className="text-xs font-normal text-primary hover:underline">Editar inventário no Perfil do Cliente</Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground"><tr className="text-left"><th className="py-1">Tipo</th><th>Qtd</th><th>Peso (UM)</th><th className="text-right">UM</th></tr></thead>
                    <tbody>
                      {TIPOS.map((t) => (
                        <tr key={t.key} className="border-t">
                          <td className="py-1.5">{t.label}</td>
                          <td>{formatNumber(state[t.qtd] || 0)}</td>
                          <td className="w-28"><Num step={0.1} value={pesos[t.key]} onChange={(v) => update("obsPesos", { ...pesos, [t.key]: v })} /></td>
                          <td className="text-right">{formatNumber((state[t.qtd] || 0) * pesos[t.key], 1)}</td>
                        </tr>
                      ))}
                      <tr className="border-t font-semibold"><td className="py-1.5" colSpan={3}>UM total</td><td className="text-right">{formatNumber(calc.umTotal, 1)}</td></tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* 3. NVPS */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">3. Carga de coleta do ambiente (NVPS)</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      {TIPOS.map((t) => (
                        <div key={t.key} className="flex items-center justify-between gap-2">
                          <Label className="text-xs">{t.label} — NVPS médio</Label>
                          <Num className="w-24" step={0.1} value={nvps[t.key]} onChange={(v) => update("obsNvpsPorAtivo", { ...nvps, [t.key]: v })} />
                        </div>
                      ))}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t">
                        <Label className="text-xs font-semibold">NVPS medido/real (0 = estimar)</Label>
                        <Num className="w-24" value={state.obsNvpsMedido ?? 0} onChange={(v) => update("obsNvpsMedido", v)} />
                      </div>
                    </div>
                    <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
                      <div className="flex justify-between text-sm"><span>NVPS previsto</span><strong>{formatNumber(calc.nvpsPrevisto, 0)}</strong></div>
                      <div className="flex justify-between text-xs text-muted-foreground"><span>Origem</span><span>{calc.nvpsOrigem === "medido" ? "Medido/real" : "Estimado pelo inventário"}</span></div>
                      <div className="flex justify-between text-sm items-center"><span>Porte</span><Badge>{calc.porte.nome}</Badge></div>
                      <div className="flex justify-between text-sm"><span>Fator de carga</span><strong>× {formatNumber(calc.fatorCarga, 2)}</strong></div>
                    </div>
                  </div>
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground"><tr className="text-left"><th className="py-1">Porte</th><th>NVPS até</th><th>Fator de carga</th></tr></thead>
                    <tbody>
                      {portes.map((p, i) => (
                        <tr key={p.nome} className={`border-t ${p.nome === calc.porte.nome ? "bg-primary/10 font-semibold" : ""}`}>
                          <td className="py-1">{p.nome}</td>
                          <td className="w-28"><Num value={p.limiteSuperior} onChange={(v) => update("obsPortes", portes.map((x, j) => j === i ? { ...x, limiteSuperior: v } : x))} /></td>
                          <td className="w-28"><Num step={0.01} value={p.fatorCarga} onChange={(v) => update("obsPortes", portes.map((x, j) => j === i ? { ...x, fatorCarga: v } : x))} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* 4. Curva */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    4. Curva base de custo por faixa de volume
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => {
                      const de = faixas.length ? faixas[faixas.length - 1].ate : 0;
                      update("obsFaixas", [...faixas, { de, ate: de + 100, custoBaseUM: 0 }]);
                    }}><Plus className="h-3 w-3" /> Faixa</Button>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Cálculo marginal: cada faixa cobra a própria tarifa só sobre a parcela de UM que cai nela.</p>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 text-[10px] text-muted-foreground px-1">
                    <span>De (&gt;)</span><span>Até (≤)</span><span>R$/UM</span><span className="text-right">UM alocada · custo</span><span />
                  </div>
                  {faixas.map((f, i) => {
                    const d = calc.detalheFaixas[i];
                    const set = (patch: Partial<typeof f>) => update("obsFaixas", faixas.map((x, j) => j === i ? { ...x, ...patch } : x));
                    return (
                      <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-center">
                        <Num value={f.de} onChange={(v) => set({ de: v })} />
                        <Num value={f.ate} onChange={(v) => set({ ate: v })} />
                        <Num step={0.01} value={f.custoBaseUM} onChange={(v) => set({ custoBaseUM: v })} />
                        <span className="text-right text-xs">{formatNumber(d?.umAlocada ?? 0, 1)} · {formatBRL(d?.custo ?? 0)}</span>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" disabled={faixas.length <= 1}
                          onClick={() => update("obsFaixas", faixas.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* 5. Fatores */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">5. Fatores por nível e componentes adicionais</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground"><tr className="text-left"><th className="py-1">Nível</th><th>Fator de plataforma</th><th>Piso de manutenção (R$/UM)</th></tr></thead>
                    <tbody>
                      {(["M1", "M2", "M3"] as const).map((n) => (
                        <tr key={n} className={`border-t ${n === nivel ? "bg-primary/10" : ""}`}>
                          <td className="py-1 font-semibold">{n}</td>
                          <td className="w-36"><Num step={0.01} value={niveis[n].fatorPlataforma} onChange={(v) => update("obsNiveis", { ...niveis, [n]: { ...niveis[n], fatorPlataforma: v } })} /></td>
                          <td className="w-36"><Num step={0.01} value={niveis[n].pisoManutencao} onChange={(v) => update("obsNiveis", { ...niveis, [n]: { ...niveis[n], pisoManutencao: v } })} /></td>
                        </tr>
                      ))}
                      <tr className="border-t text-muted-foreground"><td className="py-1 font-semibold">M4</td><td colSpan={2} className="italic">Fora do modelo por UM — precificado à parte (APM / stack própria)</td></tr>
                    </tbody>
                  </table>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="space-y-1"><Label className="text-xs">Horas de manutenção/automação</Label><Num value={horas} onChange={(v) => update("obsHorasManutencao", v)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Custo por hora (R$)</Label><Num value={custoHora} onChange={(v) => update("obsCustoHora", v)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Quantidade de proxies</Label><Num value={proxies} onChange={(v) => update("obsQtdProxies", Math.floor(v))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Custo por proxy (R$)</Label><Num value={custoProxy} onChange={(v) => update("obsCustoProxy", v)} /></div>
                  </div>
                </CardContent>
              </Card>

              {/* 6. Memória */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4" /> 6. Memória de cálculo</CardTitle></CardHeader>
                <CardContent>
                  <ol className="space-y-2 text-xs font-mono">
                    <li>1. Inventário → UM ponderada: <strong>{formatNumber(calc.umTotal, 1)} UM</strong></li>
                    <li>2. Curva marginal por faixa: <strong>{formatBRL(calc.custoFaixas)}</strong>
                      <ul className="ml-4 mt-1 space-y-0.5 text-muted-foreground">
                        {calc.detalheFaixas.filter((d) => d.umAlocada > 0).map((d, i) => (
                          <li key={i}>· {formatNumber(d.umAlocada, 1)} UM × {formatBRL(d.faixa.custoBaseUM)} = {formatBRL(d.custo)}</li>
                        ))}
                      </ul>
                    </li>
                    {calc.foraDoModeloUM ? (
                      <li>3–4. Nível M4: fora do modelo por UM — monitoramento <strong>{formatBRL(0)}</strong></li>
                    ) : (
                      <>
                        <li>3. Nível {nivel} (plataforma {formatNumber(cfg.fatorPlataforma, 2)} + piso {formatNumber(cfg.pisoManutencao, 2)}/UM): <strong>{formatBRL(calc.custoAntesCarga)}</strong></li>
                        <li>4. NVPS {calc.nvpsOrigem === "medido" ? "medido" : "previsto"} {formatNumber(calc.nvpsPrevisto, 0)} → porte {calc.porte.nome} → × {formatNumber(calc.fatorCarga, 2)}: <strong>{formatBRL(calc.custoMonitoramento)}</strong></li>
                      </>
                    )}
                    <li>5. (+) {formatNumber(horas, 1)} h × {formatBRL(custoHora)} = {formatBRL(calc.custoHoras)} · {formatNumber(proxies)} proxies × {formatBRL(custoProxy)} = {formatBRL(calc.custoProxies)}</li>
                    <li className="pt-1 border-t">6. Custo total do monitoramento: <strong className="text-sm">{formatBRL(calc.custoTotal)}</strong></li>
                  </ol>
                </CardContent>
              </Card>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Server className="h-3 w-3" /> Valores mensais (custo, antes do markup).</p>
            </div>
          </WriteFence>
        )}
      </main>
    </div>
  );
}
