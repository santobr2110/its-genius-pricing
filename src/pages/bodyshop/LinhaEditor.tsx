import { Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { brl, FAIXAS, type BodyshopCargo } from "@/lib/bodyshop/calc";
import { memorialCusto, type LinhaBS, type LinhaResultadoBS } from "@/lib/bodyshop/carrinho";
const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}%`;
function M({ l, v, strong }: { l: string; v: string; strong?: boolean }) {
  return <div className={`grid grid-cols-[minmax(0,1fr)_auto] gap-3 ${strong ? "font-semibold" : ""}`}><span className="break-words">{l}</span><span className="tabular-nums">{v}</span></div>;
}
export function BSLineEditor({ r, linha, ativos, disabled, duracao, onChange, onRemove }: {
  r: LinhaResultadoBS; linha: LinhaBS; ativos: BodyshopCargo[]; disabled: boolean; duracao: number;
  onChange: (p: Partial<LinhaBS>) => void; onRemove: () => void;
}) {
  const e = r.entrada, m = memorialCusto(e), f = r.fixos;
  const cargo = ativos.find(c => c.id === linha.cargoId);
  const cargos = Array.from(new Set(ativos.map(c => c.cargo))).sort();
  const niveis = ativos.filter(c => c.cargo === (cargo?.cargo ?? e.cargo));
  const selecionar = (c: BodyshopCargo | undefined) => { if (!c) return; const faixa = FAIXAS.find(f => f === linha.faixa && c[`salario_${f}`] != null) ?? FAIXAS.find(f => c[`salario_${f}`] != null) ?? "c3"; onChange({ cargoId: c.id, faixa, horasLinha: null, iaJustificativa: undefined, iaIndiceAderencia: undefined }); };
  const origem = (k: string) => e.origemParam[k] === "cargo" ? " (exceção do cargo)" : " (parâmetro)";
  const v = (perc: number) => brl(r.precoFinal * perc / 100);
  const L = "text-xs text-muted-foreground";
  return <article className="rounded-lg border bg-background p-3 space-y-3 text-sm transition-colors hover:border-primary/40">
    <div className="flex items-center gap-3"><div className="min-w-0 flex-1"><p className="font-medium truncate">{e.cargo} · {e.senioridade}</p><p className="text-[11px] text-muted-foreground">{e.area} · Produto {e.codigoProduto}{origem("produto")}</p></div><Button size="icon" variant="ghost" className="h-8 w-8" disabled={disabled} onClick={onRemove} aria-label="Remover item" title="Remover item"><Trash2 className="h-4 w-4" /></Button></div>
    <div className="grid grid-cols-2 md:grid-cols-[2fr_1.2fr_1.3fr] gap-2">
      <div className="space-y-1 col-span-2 md:col-span-1"><Label className={L}>Cargo</Label><Select disabled={disabled} value={cargo?.cargo ?? e.cargo} onValueChange={v => selecionar(ativos.find(c => c.cargo === v))}><SelectTrigger className="h-9" aria-label="Cargo"><SelectValue /></SelectTrigger><SelectContent>{cargos.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1"><Label className={L}>Senioridade</Label><Select disabled={disabled} value={linha.cargoId} onValueChange={id => selecionar(ativos.find(c => c.id === id))}><SelectTrigger className="h-9" aria-label="Senioridade"><SelectValue placeholder={e.senioridade} /></SelectTrigger><SelectContent>{niveis.map(c => <SelectItem key={c.id} value={c.id}>{c.senioridade} · N{c.nivel_num}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1"><Label className={L} title="C1–C6 indica a posição dentro da faixa salarial do nível, não a senioridade.">Faixa salarial (C1–C6)</Label><Select disabled={disabled} value={linha.faixa} onValueChange={(faixa: LinhaBS["faixa"]) => onChange({ faixa })}><SelectTrigger className="h-9" aria-label="Faixa salarial"><SelectValue /></SelectTrigger><SelectContent>{FAIXAS.map(f => <SelectItem disabled={cargo ? cargo[`salario_${f}`] == null : f !== linha.faixa} key={f} value={f}>{f.toUpperCase()}{cargo?.[`salario_${f}`] != null ? ` · ${brl(Number(cargo[`salario_${f}`]))}` : " · não preenchida"}</SelectItem>)}</SelectContent></Select></div>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <div className="space-y-1"><Label htmlFor={`q-${linha.id}`} className={L}>Vagas</Label><Input id={`q-${linha.id}`} className="h-9" disabled={disabled} type="number" min={1} step={1} value={linha.quantidade} onChange={ev => onChange({ quantidade: Number(ev.target.value) })} /></div>
      <div className="space-y-1"><Label className={L}>Regime</Label><Select disabled={disabled} value={linha.regime} onValueChange={(regime: LinhaBS["regime"]) => onChange({ regime, horasLinha: null })}><SelectTrigger className="h-9" aria-label="Regime"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="integral">Integral</SelectItem><SelectItem value="meio_periodo">Meio período</SelectItem></SelectContent></Select></div>
      <div className="space-y-1"><Label htmlFor={`h-${linha.id}`} className={L}>Horas mensais</Label><Input id={`h-${linha.id}`} className="h-9" disabled={disabled} type="number" min={1} value={linha.horasLinha ?? e.horasLinha} onChange={ev => onChange({ horasLinha: ev.target.value === "" ? null : Number(ev.target.value) })} /></div>
      <div className="space-y-1"><Label htmlFor={`d-${linha.id}`} className={L}>Desconto %</Label><Input id={`d-${linha.id}`} className="h-9" disabled={disabled} type="number" min={0} max={100} value={linha.descontoPerc} onChange={ev => onChange({ descontoPerc: Number(ev.target.value) })} /></div>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-[1fr_1.5fr_2fr] gap-2">
      <div className="space-y-1"><Label className={L}>Formato</Label><Select disabled={disabled} value={linha.formato ?? "padrao"} onValueChange={(v) => onChange({ formato: v === "padrao" ? undefined : v as LinhaBS["formato"] })}><SelectTrigger className="h-9" aria-label="Formato"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="padrao">Padrão da oferta</SelectItem><SelectItem value="presencial">Presencial</SelectItem><SelectItem value="remoto">Remoto</SelectItem></SelectContent></Select></div>
      <div className="space-y-1"><Label htmlFor={`loc-${linha.id}`} className={L} title="Onde o profissional fica alocado; não muda o município do ISS.">Local de alocação</Label><Input id={`loc-${linha.id}`} className="h-9" disabled={disabled} placeholder="Cidade/UF" value={linha.local ?? ""} onChange={ev => onChange({ local: ev.target.value })} /></div>
      <div className="space-y-1 col-span-2 md:col-span-1"><Label htmlFor={`hor-${linha.id}`} className={L}>Horário de atendimento</Label><Input id={`hor-${linha.id}`} className="h-9" disabled={disabled} placeholder="Padrão da oferta" value={linha.horario ?? ""} onChange={ev => onChange({ horario: ev.target.value })} /></div>
    </div>
    {r.erros.map(msg => <p key={msg} className="text-xs text-destructive">{msg}</p>)}
    {r.abaixoPiso && <p className="text-xs text-destructive">Rentabilidade abaixo do piso de {pct(e.pisoRentabilidadePerc ?? 0)}{origem("piso")}.</p>}
    {r.comissaoInstavel && <p className="text-xs text-destructive">A comissão oscila entre faixas. Confira com o Financeiro.</p>}
    {!r.erros.length && <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 rounded-md bg-muted/40 p-2 text-xs">{[
      ["Custo mensal", brl(r.custoLinha)], ["Preço mensal", brl(r.precoFinal)], ["Rentabilidade", pct(r.rentabilidadePerc)], ["Comissão", pct(r.comissaoPerc)], ["Lucro mensal", brl(r.lucro)], ["Desconto", pct(r.descontoEfetivoPerc)],
    ].map(([l, v]) => <div key={l} className="min-w-0"><p className="text-muted-foreground text-[10px] uppercase tracking-wide">{l}</p><strong className={`tabular-nums break-words ${l === "Rentabilidade" && (r.abaixoPiso || r.rentabilidadePerc < 0) ? "text-destructive" : ""}`}>{v}</strong></div>)}</div>}
    <Collapsible><CollapsibleTrigger asChild><Button variant="link" size="sm" className="p-0 h-auto gap-1"><ChevronDown className="h-3 w-3" />Detalhes do cálculo</Button></CollapsibleTrigger><CollapsibleContent className="mt-3 text-xs space-y-1">
      <M l={`Salário base ${e.faixa.toUpperCase()}`} v={brl(e.salarioBase)} />
      <M l={`× Regime ${e.regime === "integral" ? "integral" : "meio período"} (${e.horasLinha}h / ${e.horasPadrao}h)${origem("horas")}`} v={brl(m.base)} />
      <M l={`(+) Encargos ${pct(e.encargosPerc)}${origem("encargos")}`} v={brl(m.encargos)} />
      <M l={`(+) Benefícios${origem("beneficios")}${e.beneficiosProporcionais ? " · proporcionais" : " · integrais"}`} v={brl(m.beneficios)} />
      <M l="= Base para indiretos" v={brl(m.baseIndiretos)} />
      <M l={`(+) Custos indiretos ${pct(e.indiretosPerc)}${origem("indiretos")}`} v={brl(m.indiretos)} />
      <M strong l="= Custo mensal por profissional" v={brl(m.total)} /><M l={`× Quantidade ${e.quantidade}`} v={brl(r.custoLinha)} />
      {f && <><div className="border-t my-2" /><M l={`Cascata Σ ${pct(r.sigma)} → Preço de tabela`} v={brl(r.vendaTabela)} />
        <M l={`(−) Desconto ${pct(r.descontoEfetivoPerc)}`} v={`− ${brl(r.vendaTabela - r.precoFinal)}`} /><M strong l="= Preço final mensal" v={brl(r.precoFinal)} />
        <M l={`(−) PIS ${pct(f.pisPerc)} · COFINS ${pct(f.cofinsPerc)} · ISS ${pct(f.issPerc)}`} v={v(f.pisPerc + f.cofinsPerc + f.issPerc)} />
        <M l={`(−) Comissão ${pct(r.comissaoPerc)}`} v={v(r.comissaoPerc)} /><M l={`(−) Retenção ${pct(f.retencaoPerc)}`} v={v(f.retencaoPerc)} />
        <M l={`(−) IR/CSLL ${pct(f.irpjCsllPerc)}`} v={v(f.irpjCsllPerc)} /><M l={`(−) Encargos financeiros ${pct(f.encFinancPerc)}`} v={v(f.encFinancPerc)} />
        <M l="(−) Custo" v={brl(r.custoLinha)} /><M strong l={`= Lucro mensal (${pct(r.rentabilidadePerc)})`} v={brl(r.lucro)} />
        <M strong l={`× ${duracao} meses → Valor total do contrato`} v={brl(r.precoFinal * duracao)} /></>}
      {e.iaJustificativa && <div className="border-t pt-2"><p className="font-semibold">Seleção por descrição · aderência {e.iaIndiceAderencia ?? 0}%</p><p className="text-muted-foreground">{e.iaJustificativa}</p></div>}
    </CollapsibleContent></Collapsible>
  </article>;
}