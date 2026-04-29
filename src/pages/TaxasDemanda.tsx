import { useITSMContext } from "@/contexts/ITSMContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, Users, Server, Network, Database, ShieldCheck } from "lucide-react";
import SortableNav from "@/components/SortableNav";
import { Link } from "react-router-dom";
import { ITSMState } from "@/hooks/useITSMCalculator";
import { LucideIcon } from "lucide-react";

interface RateRowProps {
  icon: LucideIcon;
  label: string;
  description: string;
  value: number;
  qty: number;
  qtyLabel: string;
  onChange: (v: number) => void;
}

function RateRow({ icon: Icon, label, description, value, qty, qtyLabel, onChange }: RateRowProps) {
  const total = qty * value;
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
          <span className="text-xs text-muted-foreground">{qty.toLocaleString("pt-BR")} ×</span>
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

  const set = <K extends keyof ITSMState>(k: K) => (v: number) => update(k, v as ITSMState[K]);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
            <TrendingUp className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">Taxas de Demanda</h1>
          </Link>
          <div className="ml-auto shrink-0 pl-2">
            <SortableNav current="taxas" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6 space-y-6">
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
            />
            <RateRow
              icon={Server}
              label="Servidores"
              description="Chamados gerados por servidores físicos/virtuais"
              value={state.taxaServidor}
              qty={state.qtdServidores}
              qtyLabel="Inventário de servidores"
              onChange={set("taxaServidor")}
            />
            <RateRow
              icon={Network}
              label="Rede"
              description="Chamados de ativos de rede (switches, roteadores, firewall, AP)"
              value={state.taxaRede}
              qty={state.qtdAtivosRede}
              qtyLabel="Ativos de rede"
              onChange={set("taxaRede")}
            />
            <RateRow
              icon={Database}
              label="Banco de Dados"
              description="Chamados relacionados a instâncias de banco de dados"
              value={state.taxaBancoDados}
              qty={state.qtdBancosDados}
              qtyLabel="Bancos de dados"
              onChange={set("taxaBancoDados")}
            />
            <RateRow
              icon={ShieldCheck}
              label="Firewall"
              description="Chamados relacionados a firewalls (regras, bloqueios, VPN, incidentes)"
              value={state.taxaSistemas}
              qty={state.qtdSistemas}
              qtyLabel="Inventário de firewalls"
              onChange={set("taxaSistemas")}
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
