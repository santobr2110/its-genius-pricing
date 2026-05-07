import { useITSMContext } from "@/contexts/ITSMContext";
import SaveDefaultsButton from "@/components/SaveDefaultsButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calculator, Trash2, Users, DollarSign, BarChart3, UserPlus } from "lucide-react";
import { formatBRL, formatNumber } from "@/hooks/useITSMCalculator";
import { N1Professional } from "@/hooks/useN1TeamState";
import { Link } from "react-router-dom";
import SortableNav from "@/components/SortableNav";
import BackHomeButton from "@/components/BackHomeButton";

export default function EquipeN1() {
  const {
    n1Team,
    updateN1Professional,
    addN1Professional,
    removeN1Professional,
    updateN1Config,
    n1Results,
  } = useITSMContext();

  const profCost = (p: N1Professional) => {
    const folha = p.salarioBase * p.quantidade;
    const enc = folha * (p.encargosPerc / 100);
    const ben = p.beneficiosFixo * p.quantidade;
    const ind = (folha + enc + ben) * (p.custosIndiretosPerc / 100);
    return folha + enc + ben + ind;
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-2 px-4">
          <BackHomeButton /><Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
            <Calculator className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">Equipe N1 — Estrutura de Custos</h1>
          </Link>
          <div className="ml-auto shrink-0 pl-2">
            <SaveDefaultsButton />
            <SortableNav current="equipe-n1" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard icon={Users} label="Total Pessoas" value={String(n1Results.totalPessoas)} accent="text-blue-600 bg-blue-50" />
          <SummaryCard icon={DollarSign} label="Custo Total Equipe" value={formatBRL(n1Results.custoTotalEquipe)} accent="text-emerald-600 bg-emerald-50" />
          <SummaryCard icon={DollarSign} label="Custo/Pessoa (médio)" value={formatBRL(n1Results.custoPorPessoa)} accent="text-amber-600 bg-amber-50" />
          <SummaryCard icon={BarChart3} label="Custo/Chamado" value={formatBRL(n1Results.custoPorChamado)} accent="text-purple-600 bg-purple-50" />
        </div>

        {/* Professionals Table */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Users className="h-4 w-4" /> Perfis Profissionais
              </CardTitle>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={addN1Professional}>
                <UserPlus className="h-3.5 w-3.5" />
                Adicionar Perfil
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs min-w-[140px]">Cargo</TableHead>
                    <TableHead className="text-xs text-center w-16">Qtd</TableHead>
                    <TableHead className="text-xs text-center w-20">Escala</TableHead>
                    <TableHead className="text-xs text-right w-28">Salário Base</TableHead>
                    <TableHead className="text-xs text-center w-20">Encargos %</TableHead>
                    <TableHead className="text-xs text-right w-28">Benefícios</TableHead>
                    <TableHead className="text-xs text-center w-20">Indiretos %</TableHead>
                    <TableHead className="text-xs text-right w-28">Custo Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {n1Team.professionals.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="p-1">
                        <Input value={p.cargo} onChange={(e) => updateN1Professional(p.id, "cargo", e.target.value)} className="h-8 text-xs" />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input type="number" value={p.quantidade} onChange={(e) => updateN1Professional(p.id, "quantidade", parseInt(e.target.value) || 0)} className="h-8 text-xs text-center" min={0} />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input value={p.escala} onChange={(e) => updateN1Professional(p.id, "escala", e.target.value)} className="h-8 text-xs text-center" />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input type="number" value={p.salarioBase} onChange={(e) => updateN1Professional(p.id, "salarioBase", parseFloat(e.target.value) || 0)} className="h-8 text-xs text-right" step={100} />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input type="number" value={p.encargosPerc} onChange={(e) => updateN1Professional(p.id, "encargosPerc", parseFloat(e.target.value) || 0)} className="h-8 text-xs text-center" step={1} />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input type="number" value={p.beneficiosFixo} onChange={(e) => updateN1Professional(p.id, "beneficiosFixo", parseFloat(e.target.value) || 0)} className="h-8 text-xs text-right" step={50} />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input type="number" value={p.custosIndiretosPerc} onChange={(e) => updateN1Professional(p.id, "custosIndiretosPerc", parseFloat(e.target.value) || 0)} className="h-8 text-xs text-center" step={1} />
                      </TableCell>
                      <TableCell className="p-1 text-right">
                        <span className="text-xs font-semibold">{formatBRL(profCost(p))}</span>
                      </TableCell>
                      <TableCell className="p-1">
                        {n1Team.professionals.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeN1Professional(p.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cost Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <DollarSign className="h-4 w-4" /> Composição de Custos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <CostRow label="Folha de Pagamento" value={n1Results.custoTotalFolha} total={n1Results.custoTotalEquipe} />
              <CostRow label="Encargos Trabalhistas" value={n1Results.custoTotalEncargos} total={n1Results.custoTotalEquipe} />
              <CostRow label="Benefícios" value={n1Results.custoTotalBeneficios} total={n1Results.custoTotalEquipe} />
              <CostRow label="Custos Indiretos" value={n1Results.custoTotalIndiretos} total={n1Results.custoTotalEquipe} />
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="text-xs font-bold">Total</span>
                <span className="text-sm font-bold">{formatBRL(n1Results.custoTotalEquipe)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Productivity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4" /> Produtividade do Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Capacidade Total do Time (chamados/mês)</Label>
                <Input
                  type="number"
                  value={n1Team.capacidadeTimeTotal}
                  onChange={(e) => updateN1Config("capacidadeTimeTotal", parseInt(e.target.value) || 0)}
                  className="h-8 text-sm"
                  step={50}
                />
              </div>

              <div className="space-y-1.5 pt-2 border-t">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Total de Pessoas</span>
                  <span className="font-semibold">{n1Results.totalPessoas}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Custo Total da Equipe</span>
                  <span className="font-semibold">{formatBRL(n1Results.custoTotalEquipe)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Custo Médio/Pessoa</span>
                  <span className="font-semibold">{formatBRL(n1Results.custoPorPessoa)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Chamados/Pessoa/Mês</span>
                  <span className="font-semibold">
                    {n1Results.totalPessoas > 0 ? formatNumber(n1Team.capacidadeTimeTotal / n1Results.totalPessoas, 0) : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-xs pt-1 border-t">
                  <span className="text-muted-foreground font-semibold">Custo/Chamado</span>
                  <Badge variant="secondary" className="text-xs">{formatBRL(n1Results.custoPorChamado)}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, accent }: {
  icon: React.ElementType; label: string; value: string; accent: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-muted-foreground truncate">{label}</p>
          <p className="text-sm font-bold text-foreground truncate leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CostRow({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex gap-2">
          <span className="font-semibold">{formatBRL(value)}</span>
          <span className="text-muted-foreground w-10 text-right">{formatNumber(pct, 1)}%</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}
