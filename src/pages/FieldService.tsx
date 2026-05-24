import { useITSMContext } from "@/contexts/ITSMContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Trash2, Users, DollarSign, BarChart3, UserPlus } from "lucide-react";
import { formatBRL, formatNumber } from "@/hooks/useITSMCalculator";
import type { FieldLevel, FieldProfessional, FieldLevelState, FieldLevelResults } from "@/hooks/useFieldTeamsState";
import { Link } from "react-router-dom";
import SortableNav from "@/components/SortableNav";
import BackHomeButton from "@/components/BackHomeButton";

const LEVELS: { id: FieldLevel; label: string; desc: string }[] = [
  { id: "n1f", label: "N1 Field", desc: "Técnico presencial — atendimento de primeiro nível em campo" },
  { id: "n2f", label: "N2 Field", desc: "Analista presencial — escalonamento de chamados de usuários" },
  { id: "n3f", label: "N3 Field", desc: "Especialista presencial — atendimento crítico em campo" },
];

const profCost = (p: FieldProfessional) => {
  const folha = p.salarioBase * p.quantidade;
  const enc = folha * (p.encargosPerc / 100);
  const ben = p.beneficiosFixo * p.quantidade;
  const ind = (folha + enc + ben) * (p.custosIndiretosPerc / 100);
  return folha + enc + ben + ind;
};

export default function FieldService() {
  const {
    fieldTeams,
    fieldResults,
    updateFieldProfessional,
    addFieldProfessional,
    removeFieldProfessional,
    updateFieldLevelConfig,
    state,
    update,
  } = useITSMContext();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-2 px-4">
          <BackHomeButton />
          <Link to="/ito" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
            <MapPin className="h-5 w-5 text-orange-500 shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">Field Service — Atendimento Presencial</h1>
          </Link>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <SortableNav current="field-service" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] p-4 space-y-4">
        <Card className="border-orange-200 bg-orange-50/40 dark:bg-orange-950/20 dark:border-orange-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" /> Distribuição dos chamados de usuários (após N1 convencional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {([["percFieldN1F", "% N1 Field"], ["percFieldN2F", "% N2 Field"], ["percFieldN3F", "% N3 Field"]] as const).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={state[key] as number}
                    onChange={(e) => update(key, parseFloat(e.target.value) || 0)}
                    className="h-9 text-sm"
                  />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Soma atual: <strong>{state.percFieldN1F + state.percFieldN2F + state.percFieldN3F}%</strong>. Os percentuais representam a fatia das demandas escaladas que cada nível Field absorve.
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="n1f" className="space-y-3">
          <TabsList className="grid w-full grid-cols-3">
            {LEVELS.map((l) => (
              <TabsTrigger key={l.id} value={l.id}>{l.label}</TabsTrigger>
            ))}
          </TabsList>
          {LEVELS.map((l) => (
            <TabsContent key={l.id} value={l.id} className="space-y-4">
              <LevelView
                level={l.id}
                title={l.label}
                desc={l.desc}
                team={fieldTeams[l.id]}
                results={fieldResults[l.id]}
                onAdd={() => addFieldProfessional(l.id)}
                onRemove={(id) => removeFieldProfessional(l.id, id)}
                onUpdate={(id, field, value) => updateFieldProfessional(l.id, id, field, value)}
                onUpdateConfig={(value) => updateFieldLevelConfig(l.id, "capacidadeChamadosTotal", value)}
              />
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}

function LevelView({
  level, title, desc, team, results, onAdd, onRemove, onUpdate, onUpdateConfig,
}: {
  level: FieldLevel;
  title: string;
  desc: string;
  team: FieldLevelState;
  results: FieldLevelResults;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof Omit<FieldProfessional, "id">, value: number | string) => void;
  onUpdateConfig: (value: number) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{desc}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={Users} label="Total Pessoas" value={String(results.totalPessoas)} accent="text-blue-600 bg-blue-50" />
        <SummaryCard icon={DollarSign} label="Custo Total Equipe" value={formatBRL(results.custoTotalEquipe)} accent="text-emerald-600 bg-emerald-50" />
        <SummaryCard icon={DollarSign} label="Custo/Pessoa" value={formatBRL(results.custoPorPessoa)} accent="text-amber-600 bg-amber-50" />
        <SummaryCard icon={BarChart3} label="Custo/Chamado" value={formatBRL(results.custoPorChamado)} accent="text-purple-600 bg-purple-50" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Users className="h-4 w-4" /> Perfis Profissionais — {title}
            </CardTitle>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onAdd}>
              <UserPlus className="h-3.5 w-3.5" /> Adicionar Perfil
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
                {team.professionals.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="p-1">
                      <Input value={p.cargo} onChange={(e) => onUpdate(p.id, "cargo", e.target.value)} className="h-8 text-xs" />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input type="number" value={p.quantidade} onChange={(e) => onUpdate(p.id, "quantidade", parseInt(e.target.value) || 0)} className="h-8 text-xs text-center" min={0} />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input value={p.escala} onChange={(e) => onUpdate(p.id, "escala", e.target.value)} className="h-8 text-xs text-center" />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input type="number" value={p.salarioBase} onChange={(e) => onUpdate(p.id, "salarioBase", parseFloat(e.target.value) || 0)} className="h-8 text-xs text-right" step={100} />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input type="number" value={p.encargosPerc} onChange={(e) => onUpdate(p.id, "encargosPerc", parseFloat(e.target.value) || 0)} className="h-8 text-xs text-center" step={1} />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input type="number" value={p.beneficiosFixo} onChange={(e) => onUpdate(p.id, "beneficiosFixo", parseFloat(e.target.value) || 0)} className="h-8 text-xs text-right" step={50} />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input type="number" value={p.custosIndiretosPerc} onChange={(e) => onUpdate(p.id, "custosIndiretosPerc", parseFloat(e.target.value) || 0)} className="h-8 text-xs text-center" step={1} />
                    </TableCell>
                    <TableCell className="p-1 text-right">
                      <span className="text-xs font-semibold">{formatBRL(profCost(p))}</span>
                    </TableCell>
                    <TableCell className="p-1">
                      {team.professionals.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onRemove(p.id)}>
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" /> Capacidade do time
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-w-md">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Capacidade Total (chamados/mês)</Label>
            <Input
              type="number"
              value={team.capacidadeChamadosTotal}
              onChange={(e) => onUpdateConfig(parseInt(e.target.value) || 0)}
              className="h-8 text-sm"
              step={10}
            />
          </div>
          <div className="flex justify-between text-xs pt-2 border-t">
            <span className="text-muted-foreground">Custo/Chamado</span>
            <Badge variant="secondary">{formatBRL(results.custoPorChamado)}</Badge>
          </div>
        </CardContent>
      </Card>
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
