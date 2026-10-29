import { useITSMContext } from "@/contexts/ITSMContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table as TableIcon, Plus, Trash2, RefreshCw } from "lucide-react";
import { DEFAULT_COMISSAO_TIERS, comissaoFromRent } from "@/lib/comissaoRentabilidade";
import SortableNav from "@/components/SortableNav";
import BackHomeButton from "@/components/BackHomeButton";
import { Link } from "react-router-dom";
import FinanceiroSubNav from "@/components/itsm/FinanceiroSubNav";
import WriteFence from "@/components/auth/WriteFence";

export default function ConfiguracoesComissoes() {
  const { state, comissaoTiers } = useITSMContext();
  const comissaoAuto = comissaoFromRent(state.lucroPerc || 0, comissaoTiers);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-3 px-4">
          <BackHomeButton />
          <Link to="/ito" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
            <TableIcon className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">Comissões</h1>
          </Link>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <SortableNav current="financeiro" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-6 space-y-6">
<WriteFence permission="page.financeiro.write" anyOf={["financeiro.edit"]}>
        <FinanceiroSubNav />

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TableIcon className="h-4 w-4 text-primary" />
              Tabela de Comissão por Faixa de Rentabilidade
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Define o % de comissão de serviços aplicado conforme a rentabilidade pretendida.
              A rentabilidade atual é <span className="font-semibold text-foreground">{(state.lucroPerc || 0).toFixed(2)}%</span> →
              comissão de <span className="font-semibold text-primary">{comissaoAuto.toFixed(2)}%</span>.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2">
              <span>Rent. mínima (%)</span>
              <span>Rent. máxima (%)</span>
              <span>Comissão (%)</span>
              <span className="w-8" />
            </div>
            {comissaoTiers.map((t, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                <Input disabled value={t.minRent} className="h-8 text-right" />
                <Input disabled value={t.maxRent ?? "—"} className="h-8 text-right" />
                <Input disabled value={t.comissao} className="h-8 text-right" />
                <span className="w-8" />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Escala corporativa cadastrada na Administração. Cotações salvas preservam a escala original.</p>
          </CardContent>
        </Card>
      </WriteFence>
      </main>
    </div>
  );
}