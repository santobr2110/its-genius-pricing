import { useITSMContext } from "@/contexts/ITSMContext";
import { useState } from "react";
import SaveDefaultsButton from "@/components/SaveDefaultsButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, Users, Server, Network, Database, ShieldCheck } from "lucide-react";
import SortableNav from "@/components/SortableNav";
import BackHomeButton from "@/components/BackHomeButton";
import { Link } from "react-router-dom";
import { ITSMState } from "@/hooks/useITSMCalculator";
import { LucideIcon } from "lucide-react";

function CriticidadeInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const display = Math.round(value * 100 * 100) / 100;
  const [text, setText] = useState<string>(String(display));
  const [focused, setFocused] = useState(false);
  return (
    <Input
      type="text"
      inputMode="numeric"
      value={focused ? text : String(display)}
      onFocus={() => {
        setText(String(display));
        setFocused(true);
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const v = e.target.value;
        setText(v);
        if (v === "" || v === "-") return;
        const parsed = parseFloat(v);
        if (!isNaN(parsed)) onChange(parsed / 100);
      }}
      className="h-9 pr-7"
    />
  );
}

interface RateRowProps {
  icon: LucideIcon;
  label: string;
  description: string;
  value: number;
  qty: number;
  qtyLabel: string;
  onChange: (v: number) => void;
  ajuste?: number;
}

function RateRow({ icon: Icon, label, description, value, qty, qtyLabel, onChange, ajuste = 0 }: RateRowProps) {
  const valorAjustado = Math.max(0, value * (1 + ajuste));
  const total = qty * valorAjustado;
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_180px] gap-3 items-center p-4 rounded-lg border bg-card">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Chamados / mês por unidade</Label>
        <Input
          type="number"
          step={0.1}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="h-9"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{qtyLabel}</Label>
        <div className="flex items-center justify-between gap-2 h-9 px-3 rounded-md border bg-muted/30">
          <span className="text-xs text-muted-foreground">
            {qty.toLocaleString("pt-BR")} × {valorAjustado.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
            {ajuste !== 0 && (
              <span className="ml-1 text-[10px]">({ajuste > 0 ? "+" : ""}{(ajuste * 100).toFixed(0)}%)</span>
            )}
          </span>
          <span className="text-sm font-semibold text-foreground">
            {total.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ch/mês
          </span>
        </div>
      </div>
    </div>
  );
}

export default function TaxasDemanda() {
  const { state, update, results } = useITSMContext();
  const criticidadeEscala = state.criticidadeEscala ?? [-0.3, -0.15, 0, 0.15, 0.3];
  const criticidadeNivel = state.criticidadeNivel ?? 2;
  const ajusteCriticidade = criticidadeEscala[criticidadeNivel] ?? 0;

  const set = <K extends keyof ITSMState>(k: K) => (v: number) => update(k, v as ITSMState[K]);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-3 px-4">
          <BackHomeButton /><Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
            <TrendingUp className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">Métricas e Parâmetros</h1>
          </Link>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <SaveDefaultsButton />
            <SortableNav current="taxas" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6 space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Smart Monitor</CardTitle>
            <p className="text-xs text-muted-foreground">
              Parâmetros usados para compor o custo da camada Smart Monitor.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Custo por ativo monitorado (R$/mês)</Label>
                <Input
                  type="number"
                  step={1}
                  min={0}
                  value={state.custoAtivoMonitorado}
                  onChange={(e) => update("custoAtivoMonitorado", parseFloat(e.target.value) || 0)}
                  className="h-9"
                />
                <p className="text-[11px] text-muted-foreground">
                  Aplicado sobre Servidores + Rede + Firewall.
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">% Alocação N1 — Smart Monitor</Label>
                <Input
                  type="number"
                  step={1}
                  min={0}
                  max={100}
                  value={state.percAlocacaoN1Monitor}
                  onChange={(e) => update("percAlocacaoN1Monitor", parseFloat(e.target.value) || 0)}
                  className="h-9"
                />
                <p className="text-[11px] text-muted-foreground">
                  % × custo por chamado N1 × chamados de Servidores+Rede+Firewall.
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Custo ferramenta end-point (R$/mês por equipamento)</Label>
                <Input
                  type="number"
                  step={1}
                  min={0}
                  value={state.custoFerramentaEndpoint}
                  onChange={(e) => update("custoFerramentaEndpoint", parseFloat(e.target.value) || 0)}
                  className="h-9"
                />
                <p className="text-[11px] text-muted-foreground">
                  Aplicado sobre o nº de Equipamentos Desk/Note/Cel/Tablet — compõe custo de gestão.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Escala de Criticidade do Ambiente</CardTitle>
            <p className="text-xs text-muted-foreground">
              Multiplicador percentual aplicado às taxas de chamados/mês conforme o nível de criticidade selecionado no inventário do cliente.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {["Muito Baixo", "Baixo", "Ideal", "Alto", "Muito Alto"].map((nome, idx) => (
                <div key={nome} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{nome}</Label>
                  <div className="relative">
                    <CriticidadeInput
                      value={criticidadeEscala[idx] ?? 0}
                      onChange={(v) => {
                        const next = [...criticidadeEscala];
                        next[idx] = v;
                        update("criticidadeEscala", next);
                      }}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              O valor é aplicado como multiplicador percentual sobre a taxa de chamados/mês de cada categoria (ex.: -30% reduz a taxa em 30%).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Volume mensal de chamados por categoria</CardTitle>
            <p className="text-xs text-muted-foreground">
              Defina quantos chamados por mês cada item do inventário gera, em média.
              O total é calculado automaticamente a partir do inventário do cliente.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <RateRow
              icon={Users}
              label="Usuários"
              description="Chamados originados pelos usuários finais (suporte ao usuário)"
              value={state.taxaUsuario}
              qty={state.qtdUsuarios}
              qtyLabel="Inventário de usuários"
              onChange={set("taxaUsuario")}
              ajuste={ajusteCriticidade}
            />
            <RateRow
              icon={Server}
              label="Servidores"
              description="Chamados gerados por servidores físicos/virtuais"
              value={state.taxaServidor}
              qty={state.qtdServidores}
              qtyLabel="Inventário de servidores"
              onChange={set("taxaServidor")}
              ajuste={ajusteCriticidade}
            />
            <RateRow
              icon={Network}
              label="Rede"
              description="Chamados de ativos de rede (switches, roteadores, firewall, AP)"
              value={state.taxaRede}
              qty={state.qtdAtivosRede}
              qtyLabel="Ativos de rede"
              onChange={set("taxaRede")}
              ajuste={ajusteCriticidade}
            />
            <RateRow
              icon={Database}
              label="Banco de Dados"
              description="Chamados relacionados a instâncias de banco de dados"
              value={state.taxaBancoDados}
              qty={state.qtdBancosDados}
              qtyLabel="Bancos de dados"
              onChange={set("taxaBancoDados")}
              ajuste={ajusteCriticidade}
            />
            <RateRow
              icon={ShieldCheck}
              label="Firewall"
              description="Chamados relacionados a firewalls (regras, bloqueios, VPN, incidentes)"
              value={state.taxaSistemas}
              qty={state.qtdSistemas}
              qtyLabel="Inventário de firewalls"
              onChange={set("taxaSistemas")}
              ajuste={ajusteCriticidade}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium">Total Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {results.totalChamadosUsuarios.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground">chamados/mês</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium">Total Infraestrutura</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {results.totalChamadosInfra.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground">chamados/mês</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium">Volume Total Bruto</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">
                {results.volumeTotalBruto.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground">chamados/mês</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
