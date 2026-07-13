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
  const { state, comissaoTiers, setComissaoTiers } = useITSMContext();
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
                <Input
                  type="number"
                  step={0.01}
                  value={t.minRent}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    const next = [...comissaoTiers];
                    next[idx] = { ...next[idx], minRent: v };
                    setComissaoTiers(next);
                  }}
                  className="h-8 text-right"
                />
                <Input
                  type={t.maxRent == null ? "text" : "number"}
                  step={0.01}
                  value={t.maxRent == null ? "—" : t.maxRent}
                  disabled={t.maxRent == null}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    const next = [...comissaoTiers];
                    next[idx] = { ...next[idx], maxRent: Number.isFinite(v) ? v : null };
                    setComissaoTiers(next);
                  }}
                  className="h-8 text-right"
                />
                <Input
                  type="number"
                  step={0.01}
                  value={t.comissao}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    const next = [...comissaoTiers];
                    next[idx] = { ...next[idx], comissao: v };
                    setComissaoTiers(next);
                  }}
                  className="h-8 text-right"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setComissaoTiers(comissaoTiers.filter((_, i) => i !== idx))}
                  disabled={comissaoTiers.length <= 1}
                  title="Remover faixa"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const last = comissaoTiers[comissaoTiers.length - 1];
                  const base = last ? (last.maxRent ?? last.minRent) + 0.01 : 0;
                  setComissaoTiers([
                    ...comissaoTiers,
                    { minRent: base, maxRent: base + 4.99, comissao: 0 },
                  ]);
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar faixa
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setComissaoTiers(DEFAULT_COMISSAO_TIERS)}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Restaurar padrão
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Use <span className="font-semibold">máxima vazia</span> ou <code>null</code> para a última faixa (sem limite superior).
              Mantenha as faixas em ordem crescente e sem sobreposição.
            </p>
          </CardContent>
        </Card>
      </WriteFence>
      </main>
    </div>
  );
}