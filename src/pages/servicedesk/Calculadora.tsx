import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import WriteFence from "@/components/auth/WriteFence";
import { useServiceDesk } from "@/contexts/ServiceDeskContext";
import { brl, pct, vol } from "@/lib/servicedesk/format";
import {
  ITSM_TIPO_LABEL, MODALIDADE_LABEL, REGIME_LABEL, regimeExplicacao,
  type ItsmTipo, type Modalidade,
} from "@/lib/servicedesk/regimeCusto";
import { JANELA_LABEL, type JanelaCobertura } from "@/lib/servicedesk/coberturaFTE";
import { CANAIS_ALL, CANAL_LABEL, type CanalKey } from "@/lib/servicedesk/funilAtendimento";
import { SLA_LABEL, type NivelSLA, type SitePresencial } from "@/lib/servicedesk/types";
import SalvarPrecificacaoSD from "@/components/servicedesk/SalvarPrecificacaoSD";
import Sigla from "@/components/servicedesk/Sigla";

function Gate({
  n, titulo, descricao, children, badge,
}: { n: string; titulo: string; descricao?: string; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {n}
          </span>
          {titulo}
          {badge}
        </CardTitle>
        {descricao && <p className="text-xs text-muted-foreground">{descricao}</p>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function NumField({
  label, value, onChange, step = 1, suffix,
}: { label: string; value: number; onChange: (v: number) => void; step?: number; suffix?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="h-8"
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

export default function ServiceDeskCalculadora() {
  const { state, update, results, rotinasOff, toggleRotina, toggleTodasRotinas, itens, valorItem } =
    useServiceDesk();

  const rotinaIds = useMemo(() => (state.rotinas ?? []).map((r) => r.id), [state.rotinas]);
  const todasAtivas = rotinaIds.every((id) => !rotinasOff.includes(id));

  const toggleCanal = (c: CanalKey) => {
    const has = state.canais.includes(c);
    update("canais", has ? state.canais.filter((x) => x !== c) : [...state.canais, c]);
  };

  const addSite = () => {
    const site: SitePresencial = {
      id: `site-${Date.now().toString(36)}`,
      nome: "Novo site",
      cidade: "",
      headcount: 1,
      adicionalMensal: 0,
    };
    update("sites", [...state.sites, site]);
  };
  const updateSite = (id: string, patch: Partial<SitePresencial>) =>
    update("sites", state.sites.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeSite = (id: string) => update("sites", state.sites.filter((s) => s.id !== id));

  return (
    <WriteFence permission="page.sd.calculadora.write">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">Preço de venda mensal</p>
            <p className="text-xl font-bold">{brl(results.precoVendaMensal)}</p>
          </div>
          <div className="border-l pl-4">
            <p className="text-xs text-muted-foreground">Rentabilidade</p>
            <p className="text-xl font-bold">{pct(results.rentabilidadePct)}</p>
          </div>
          <div className="border-l pl-4">
            <p className="text-xs text-muted-foreground">Regime de custo</p>
            <p className="text-sm font-semibold">{REGIME_LABEL[results.regime]}</p>
          </div>
          <div className="border-l pl-4">
            <p className="text-xs text-muted-foreground"><Sigla termo="FTE">FTE</Sigla> contratado (pessoas em tempo integral)</p>
            <p className="text-sm font-semibold">
              {vol(results.cobertura.fteContratado)}
              {results.cobertura.pisoAplicado && (
                <Badge variant="secondary" className="ml-2 text-[10px]">piso da janela</Badge>
              )}
            </p>
          </div>
          <div className="ml-auto">
            <SalvarPrecificacaoSD />
          </div>
        </div>

        <Gate n="1" titulo="Modalidade" descricao="Define se a operação é remota, presencial ou híbrida.">
          <Select value={state.modalidade} onValueChange={(v) => update("modalidade", v as Modalidade)}>
            <SelectTrigger className="h-9 w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(MODALIDADE_LABEL) as Modalidade[]).map((m) => (
                <SelectItem key={m} value={m}>{MODALIDADE_LABEL[m]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{regimeExplicacao(results.regime)}</p>
        </Gate>

        <Gate n="2" titulo="Ferramenta ITSM" descricao="ITSM (IT Service Management) é a plataforma de gestão de chamados usada na operação.">
          <Select value={state.itsmTipo} onValueChange={(v) => update("itsmTipo", v as ItsmTipo)}>
            <SelectTrigger className="h-9 w-80"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(ITSM_TIPO_LABEL) as ItsmTipo[]).map((t) => (
                <SelectItem key={t} value={t}>{ITSM_TIPO_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid gap-3 md:grid-cols-2">
            {results.regime === "semidedicado" && (
              <NumField label="Fator de ineficiência" value={state.fatorIneficiencia} step={0.05}
                onChange={(v) => update("fatorIneficiencia", v)} suffix="x" />
            )}
            {state.itsmTipo === "cliente-integrado" && (
              <NumField label="Integração com ITSM do cliente (valor único)" value={state.custoIntegracaoOneTime}
                onChange={(v) => update("custoIntegracaoOneTime", v)} />
            )}
          </div>
        </Gate>

        <Gate n="3" titulo="Cobertura (janela de atendimento)" descricao="O FTE (profissional em tempo integral) vinculante é sempre o MAIOR entre o calculado por volume e o piso mínimo da janela de atendimento.">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Janela de atendimento</Label>
              <Select value={state.janelaCobertura} onValueChange={(v) => update("janelaCobertura", v as JanelaCobertura)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(JANELA_LABEL) as JanelaCobertura[]).map((j) => (
                    <SelectItem key={j} value={j}>{JANELA_LABEL[j]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <NumField label="Piso mínimo de pessoas (FTE)" step={0.5}
              value={state.pisosCobertura[state.janelaCobertura]?.min ?? 0}
              onChange={(v) => update("pisosCobertura", {
                ...state.pisosCobertura,
                [state.janelaCobertura]: { ...state.pisosCobertura[state.janelaCobertura], min: v },
              })} />
            <NumField label="Teto de referência de pessoas (FTE)" step={0.5}
              value={state.pisosCobertura[state.janelaCobertura]?.max ?? 0}
              onChange={(v) => update("pisosCobertura", {
                ...state.pisosCobertura,
                [state.janelaCobertura]: { ...state.pisosCobertura[state.janelaCobertura], max: v },
              })} />
            <NumField label="Horas/mês por profissional (FTE)" value={state.horasMesFTE} onChange={(v) => update("horasMesFTE", v)} />
          </div>
          <div className="rounded-md bg-muted/50 p-3 text-xs">
            <Sigla termo="FTE">FTE</Sigla> por volume: <strong>{vol(results.cobertura.fteVolume)}</strong> · Piso:{" "}
            <strong>{vol(results.cobertura.ftePiso)}</strong> · Contratado:{" "}
            <strong>{vol(results.cobertura.fteContratado)}</strong>
            {results.cobertura.acimaDoMax && (
              <span className="ml-2 text-destructive">Acima do teto de referência da janela.</span>
            )}
          </div>
        </Gate>

        <Gate n="4" titulo="Volume e inventário atendido">
          <div className="grid gap-3 md:grid-cols-4">
            <NumField label="Usuários padrão" value={state.qtdUsuariosPadrao} onChange={(v) => update("qtdUsuariosPadrao", v)} />
            <NumField label="Usuários VIP" value={state.qtdUsuariosVIP} onChange={(v) => update("qtdUsuariosVIP", v)} />
            <NumField label="Estações de trabalho" value={state.qtdEstacoes} onChange={(v) => update("qtdEstacoes", v)} />
            <NumField label="Volume bruto de contatos / mês" value={state.volumeBrutoMes} onChange={(v) => update("volumeBrutoMes", v)} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <NumField label="% desvio por autoatendimento" value={state.pctAutoatendimento} onChange={(v) => update("pctAutoatendimento", v)} suffix="%" />
            <NumField label="% resolvido na triagem (N0 — autoatendimento/triagem)" value={state.pctTriagem} onChange={(v) => update("pctTriagem", v)} suffix="%" />
            <NumField label="Produtividade (chamados por profissional/mês)" value={state.produtividadeChamadosFTE} onChange={(v) => update("produtividadeChamadosFTE", v)} />
          </div>
          <div className="rounded-md bg-muted/50 p-3 text-xs">
            Bruto {vol(results.funil.volumeBruto)} → autoatendimento −{vol(results.funil.desviadoAutoatendimento)} →
            triagem −{vol(results.funil.resolvidoTriagem)} → <strong>N1 {vol(results.funil.chamadosN1)}</strong> →
            escalonados {vol(results.funil.chamadosEscalonados)} ·{" "}
            <Sigla termo="UM">UM</Sigla> {vol(results.umTotal)} ·
            plataforma {brl(results.custoPlataforma)}
          </div>
        </Gate>

        <Gate n="5" titulo="Escalonamento (bolsa de horas)" descricao="Pacote mensal de horas técnicas de N2/N3, distribuído por prioridade entre chamados, rotinas, melhoria e horas técnicas.">
          <div className="grid gap-3 md:grid-cols-4">
            <NumField label="% escalonado do N1 (1º nível) para N2/N3" value={state.pctEscalonado} onChange={(v) => update("pctEscalonado", v)} suffix="%" />
            <NumField label="Bolsa de horas / mês" value={state.bolsaHorasEscalonamento} onChange={(v) => update("bolsaHorasEscalonamento", v)} />
            <NumField label="Tempo médio por escalonamento (h)" step={0.1} value={state.tempoMedioEscalonamentoH} onChange={(v) => update("tempoMedioEscalonamentoH", v)} />
            <NumField label="Valor hora do especialista N2/N3" value={state.valorHoraEscalonamento} onChange={(v) => update("valorHoraEscalonamento", v)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">
              Horas de melhoria: {vol(results.distribuicaoHoras.melhoria)}h de {vol(results.distribuicaoHoras.total)}h
            </Label>
            <Slider
              value={[state.horasMelhoria]}
              min={0}
              max={Math.max(0, state.bolsaHorasEscalonamento)}
              step={1}
              onValueChange={([v]) => update("horasMelhoria", v)}
            />
          </div>
          <div className="rounded-md bg-muted/50 p-3 text-xs">
            Chamados {vol(results.distribuicaoHoras.chamados)}h · Rotinas {vol(results.distribuicaoHoras.rotinas)}h ·
            Melhoria {vol(results.distribuicaoHoras.melhoria)}h · Técnicas {vol(results.distribuicaoHoras.tecnicas)}h
            {results.distribuicaoHoras.excedente > 0 && (
              <span className="ml-2 text-destructive">
                Déficit de {vol(results.distribuicaoHoras.excedente)}h frente à bolsa contratada.
              </span>
            )}
          </div>
        </Gate>

        <Gate n="6" titulo="Base de Conhecimento"
          badge={<Switch className="ml-2" checked={state.baseConhecimentoAtiva} onCheckedChange={(v) => update("baseConhecimentoAtiva", v)} />}>
          {state.baseConhecimentoAtiva && (
            <div className="grid gap-3 md:grid-cols-2">
              <NumField label="Implantação (valor único)" value={state.baseConhecimentoSetup} onChange={(v) => update("baseConhecimentoSetup", v)} />
              <NumField label="Horas de curadoria / mês" value={state.baseConhecimentoHorasMes} onChange={(v) => update("baseConhecimentoHorasMes", v)} />
            </div>
          )}
        </Gate>

        <Gate n="7" titulo="Multicanal">
          <div className="flex flex-wrap gap-3">
            {CANAIS_ALL.map((c) => (
              <label key={c} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                <Checkbox checked={state.canais.includes(c)} onCheckedChange={() => toggleCanal(c)} />
                {CANAL_LABEL[c]}
              </label>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <NumField label="Canais inclusos" value={state.canaisInclusos} onChange={(v) => update("canaisInclusos", v)} />
            <NumField label="Custo por canal adicional" value={state.custoPorCanalAdicional} onChange={(v) => update("custoPorCanalAdicional", v)} />
            <div className="space-y-1">
              <Label className="text-xs">Chatbot com IA</Label>
              <div className="flex h-8 items-center gap-2">
                <Switch checked={state.chatbotIA} onCheckedChange={(v) => update("chatbotIA", v)} />
                <span className="text-xs text-muted-foreground">
                  {results.canaisAdicionais} canal(is) adicional(is) · {brl(results.custoCanaisAdicionais)}
                </span>
              </div>
            </div>
          </div>
          {state.chatbotIA && (
            <div className="grid gap-3 md:grid-cols-2">
              <NumField label="Chatbot — implantação (valor único)" value={state.chatbotIASetup} onChange={(v) => update("chatbotIASetup", v)} />
              <NumField label="Chatbot — mensalidade" value={state.chatbotIAMensal} onChange={(v) => update("chatbotIAMensal", v)} />
            </div>
          )}
        </Gate>

        <Gate n="8" titulo="SLA — Acordo de Nível de Serviço" descricao="Níveis mais exigentes de prazo aplicam um fator multiplicador sobre o custo total.">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Nível de SLA</Label>
              <Select value={state.nivelSLA} onValueChange={(v) => update("nivelSLA", v as NivelSLA)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(SLA_LABEL) as NivelSLA[]).map((s) => (
                    <SelectItem key={s} value={s}>{SLA_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(Object.keys(SLA_LABEL) as NivelSLA[]).map((s) => (
              <NumField key={s} label={`Fator ${SLA_LABEL[s]}`} step={0.01} value={state.fatoresSLA[s]}
                onChange={(v) => update("fatoresSLA", { ...state.fatoresSLA, [s]: v })} suffix="x" />
            ))}
          </div>
        </Gate>

        <Gate n="8B" titulo="Rotinas preventivas (opcional)"
          badge={<Switch className="ml-2" checked={state.rotinasAtivas} onCheckedChange={(v) => update("rotinasAtivas", v)} />}>
          {state.rotinasAtivas && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={todasAtivas}
                      onCheckedChange={(v) => toggleTodasRotinas(rotinaIds, !!v)}
                      aria-label="Ativar/desativar todas"
                    />
                  </TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Rotina</TableHead>
                  <TableHead>Frequência</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead className="text-right">Horas/mês</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...results.rotinas.base, ...results.rotinas.avancado].map((c) => (
                  <TableRow key={c.rotina.id}>
                    <TableCell>
                      <Checkbox
                        checked={!rotinasOff.includes(c.rotina.id)}
                        onCheckedChange={() => toggleRotina(c.rotina.id)}
                      />
                    </TableCell>
                    <TableCell className="text-xs">{c.rotina.grupo}</TableCell>
                    <TableCell className="text-xs">{c.rotina.rotina}</TableCell>
                    <TableCell className="text-xs">{c.rotina.frequencia}</TableCell>
                    <TableCell className="text-xs">{c.rotina.nivel}</TableCell>
                    <TableCell className="text-right text-xs">{vol(c.horasMes)}</TableCell>
                  </TableRow>
                ))}
                {(state.rotinas ?? [])
                  .filter((r) => rotinasOff.includes(r.id))
                  .map((r) => (
                    <TableRow key={r.id} className="opacity-50">
                      <TableCell>
                        <Checkbox checked={false} onCheckedChange={() => toggleRotina(r.id)} />
                      </TableCell>
                      <TableCell className="text-xs">{r.grupo}</TableCell>
                      <TableCell className="text-xs">{r.rotina}</TableCell>
                      <TableCell className="text-xs">{r.frequencia}</TableCell>
                      <TableCell className="text-xs">{r.nivel}</TableCell>
                      <TableCell className="text-right text-xs">—</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </Gate>

        {state.modalidade !== "remoto" && (
          <Gate n="9" titulo="Sites presenciais">
            <div className="grid gap-3 md:grid-cols-2">
              <NumField label="Adicional mensal por FTE dedicado" value={state.custoFTEDedicadoAdicional}
                onChange={(v) => update("custoFTEDedicadoAdicional", v)} />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead className="w-28">Headcount</TableHead>
                  <TableHead className="w-36">Adicional mensal</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.sites.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell><Input className="h-8" value={s.nome} onChange={(e) => updateSite(s.id, { nome: e.target.value })} /></TableCell>
                    <TableCell><Input className="h-8" value={s.cidade} onChange={(e) => updateSite(s.id, { cidade: e.target.value })} /></TableCell>
                    <TableCell><Input className="h-8" type="number" value={s.headcount} onChange={(e) => updateSite(s.id, { headcount: Number(e.target.value) || 0 })} /></TableCell>
                    <TableCell><Input className="h-8" type="number" value={s.adicionalMensal} onChange={(e) => updateSite(s.id, { adicionalMensal: Number(e.target.value) || 0 })} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeSite(s.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button variant="outline" size="sm" onClick={addSite} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Adicionar site
            </Button>
          </Gate>
        )}

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Itens adicionais</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Cobrança</TableHead>
                  <TableHead className="text-right">Valor de venda</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.filter((i) => i.ativo).map((i) => {
                  const v = valorItem(i);
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="text-xs">
                        {i.descricao}
                        {v.detalhe && <span className="ml-1 text-muted-foreground">({v.detalhe})</span>}
                      </TableCell>
                      <TableCell className="text-xs">{i.cobranca === "one-time" ? "Valor único" : "Mensal"}</TableCell>
                      <TableCell className="text-right text-xs">{brl(v.valor)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </WriteFence>
  );
}