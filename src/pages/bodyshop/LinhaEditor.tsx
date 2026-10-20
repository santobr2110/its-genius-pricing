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
  return <article className="rounded-lg border bg-background p-3 space-y-3">
    <div className="flex justify-between gap-2"><div className="min-w-0"><h3 className="font-medium break-words">{e.cargo} · {e.senioridade}</h3><p className="text-xs text-muted-foreground">{e.area} · Produto {e.codigoProduto}{origem("produto")}</p></div><Button size="icon" variant="ghost" disabled={disabled} onClick={onRemove} aria-label="Remover item" title="Remover item"><Trash2 className="h-4 w-4" /></Button></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      <div><Label>Cargo</Label><Select disabled={disabled} value={cargo?.cargo ?? e.cargo} onValueChange={v => selecionar(ativos.find(c => c.cargo === v))}><SelectTrigger aria-label="Cargo"><SelectValue /></SelectTrigger><SelectContent>{cargos.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Senioridade</Label><Select disabled={disabled} value={linha.cargoId} onValueChange={id => selecionar(ativos.find(c => c.id === id))}><SelectTrigger aria-label="Senioridade"><SelectValue placeholder={e.senioridade} /></SelectTrigger><SelectContent>{niveis.map(c => <SelectItem key={c.id} value={c.id}>{c.senioridade} · N{c.nivel_num}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Faixa salarial</Label><Select disabled={disabled} value={linha.faixa} onValueChange={(faixa: LinhaBS["faixa"]) => onChange({ faixa })}><SelectTrigger aria-label="Faixa salarial"><SelectValue /></SelectTrigger><SelectContent>{FAIXAS.map(f => <SelectItem disabled={cargo ? cargo[`salario_${f}`] == null : f !== linha.faixa} key={f} value={f}>{f.toUpperCase()}{cargo?.[`salario_${f}`] != null ? ` · ${brl(Number(cargo[`salario_${f}`]))}` : " · não preenchida"}</SelectItem>)}</SelectContent></Select></div>
    </div>
    <p className="text-xs text-muted-foreground">C1–C6 indica a posição dentro da faixa salarial do nível, não a senioridade.</p>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <div><Label htmlFor={`q-${linha.id}`}>Quantidade de vagas</Label><Input id={`q-${linha.id}`} disabled={disabled} type="number" min={1} step={1} value={linha.quantidade} onChange={ev => onChange({ quantidade: Number(ev.target.value) })} /></div>
      <div><Label>Regime</Label><Select disabled={disabled} value={linha.regime} onValueChange={(regime: LinhaBS["regime"]) => onChange({ regime, horasLinha: null })}><SelectTrigger aria-label="Regime"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="integral">Integral</SelectItem><SelectItem value="meio_periodo">Meio período</SelectItem></SelectContent></Select></div>
      <div><Label htmlFor={`h-${linha.id}`}>Horas mensais</Label><Input id={`h-${linha.id}`} disabled={disabled} type="number" min={1} value={linha.horasLinha ?? e.horasLinha} onChange={ev => onChange({ horasLinha: ev.target.value === "" ? null : Number(ev.target.value) })} /></div>
      <div><Label htmlFor={`d-${linha.id}`}>Desconto %</Label><Input id={`d-${linha.id}`} disabled={disabled} type="number" min={0} max={100} value={linha.descontoPerc} onChange={ev => onChange({ descontoPerc: Number(ev.target.value) })} /></div>
    </div>
    {r.erros.map(msg => <p key={msg} className="text-xs text-destructive">{msg}</p>)}
    {r.abaixoPiso && <p className="text-xs text-destructive">Rentabilidade abaixo do piso de {pct(e.pisoRentabilidadePerc ?? 0)}{origem("piso")}.</p>}
    {r.comissaoInstavel && <p className="text-xs text-destructive">A comissão oscila entre faixas. Confira com o Financeiro.</p>}
    {!r.erros.length && <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 border-y py-2 text-xs">{[
      ["Custo mensal", brl(r.custoLinha)], ["Preço mensal", brl(r.precoFinal)], ["Rentabilidade", pct(r.rentabilidadePerc)], ["Comissão", pct(r.comissaoPerc)], ["Lucro mensal", brl(r.lucro)], ["Desconto", pct(r.descontoEfetivoPerc)],
    ].map(([l, v]) => <div key={l} className="min-w-0"><p className="text-muted-foreground text-[10px]">{l}</p><strong className={`tabular-nums break-words ${l === "Rentabilidade" && (r.abaixoPiso || r.rentabilidadePerc < 0) ? "text-destructive" : ""}`}>{v}</strong></div>)}</div>}
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